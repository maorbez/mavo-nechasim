"""Disposable local PostgreSQL, no production connection or real customer data."""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

root=Path(__file__).resolve().parents[1]
old=root/'supabase/migrations/202610090001_public_media_manifest.sql'
new=root/'supabase/migrations/202610100001_r2_public_media.sql'


def run(command,**kwargs):
    return subprocess.run(command,text=True,capture_output=True,check=True,**kwargs)


with tempfile.TemporaryDirectory(prefix='mavo-r2-sql-') as directory:
    base=Path(directory); data=base/'data'; socket=base/'socket'; socket.mkdir()
    run([shutil.which('initdb'),'-D',str(data),'-A','trust','--no-locale'])
    run([shutil.which('pg_ctl'),'-D',str(data),'-l',str(base/'postgres.log'),'-o',
         f"-k {socket} -c listen_addresses='' -p 65431",'start'])
    try:
        command=[shutil.which('psql'),'-X','-At','-v','ON_ERROR_STOP=1','-h',str(socket),'-p','65431','-d','postgres']
        def sql(value):return run(command,input=value).stdout.strip()
        sql("create role anon; create role authenticated; create table public.properties(id int, owner_phone text, media_manifest jsonb); create schema storage; create table storage.buckets(id text,file_size_limit bigint,allowed_mime_types text[]); insert into storage.buckets(id) values('property-photos');")
        sql(old.read_text())
        if new.exists():sql(new.read_text())
        def manifest(url):return {'version':1,'cover_media_id':'cover','items':[{'id':'cover','type':'image','url':url}]}
        def valid(value):
            literal=json.dumps(value).replace("'","''")
            return sql("select public.valid_property_media_manifest('"+literal+"'::jsonb);")=='t'
        path='property-42/revision-3/00-'+('a'*64)+'.webp'
        r2='https://media.mavorealestate.com/'+path
        legacy='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/'+path
        assert valid(manifest(legacy)), 'Legacy public media must remain valid'
        assert valid(manifest(r2)), 'Approved R2 origin must be accepted'
        for bad in [r2+'?token=private',r2.replace('media.mavorealestate.com','media.mavorealestate.com.evil.test'),
                    r2.replace('/property-42/','/private/'),r2.replace('.webp','.pdf'),r2.replace('https://','https://secret@')]:
            assert not valid(manifest(bad)), 'Unsafe public URL was accepted'
        video={'version':1,'cover_media_id':'video','items':[{'id':'video','type':'video','url':r2.replace('.webp','.mp4'),'poster_url':r2,'fallback_url':legacy}]}
        assert valid(video)
        del video['items'][0]['poster_url']
        assert not valid(video), 'Missing poster must be rejected'
        assert sql('select public.valid_property_media_manifest(NULL);')=='t'
        assert not valid(None), 'JSON null must not masquerade as SQL NULL'
        assert sql('set role anon; select media_manifest from public.properties;')=='SET'
        denied=subprocess.run(command,input='set role anon; select owner_phone from public.properties;',text=True,capture_output=True)
        assert denied.returncode!=0 and 'permission denied' in denied.stderr
        print('PASS PostgreSQL: R2/legacy, malicious origins, video poster/fallback, NULL legacy, private-column denial')
    finally:
        run([shutil.which('pg_ctl'),'-D',str(data),'stop','-m','fast'])

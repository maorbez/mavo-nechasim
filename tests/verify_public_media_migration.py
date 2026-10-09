"""Apply the additive media migration to disposable local PostgreSQL and check grants.
Requires initdb, pg_ctl and psql on PATH. Uses a private Unix socket, no TCP.
Does not read credentials or connect to any deployed database.
"""
import json,subprocess,tempfile,pathlib,shutil
bin=pathlib.Path(shutil.which('initdb') or '/missing/initdb').parent
site=pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='mavo-pg-',dir='/tmp') as t:
 root=pathlib.Path(t);data=root/'data'
 def run(args,**kw):return subprocess.run([str(x) for x in args],capture_output=True,text=True,check=True,**kw)
 run([bin/'initdb','-D',data,'--no-locale','--encoding=UTF8','--auth=trust'])
 run([bin/'pg_ctl','-D',data,'-l',root/'server.log','-o',f"-F -k {root} -h ''",'-w','start'])
 try:
  def sql(value,check=True):return subprocess.run([str(bin/'psql'),'-X','-h',str(root),'-d','postgres','-v','ON_ERROR_STOP=1','-At'],input=value,capture_output=True,text=True,check=check)
  sql('''create role anon;create role authenticated;create role service_role;
   create table public.properties(id bigint primary key,active boolean,office_property_id text);
   create schema storage;create table storage.buckets(id text primary key,file_size_limit bigint,allowed_mime_types text[]);
   insert into storage.buckets(id) values('property-photos');
   alter table public.properties enable row level security;
   create policy public_active on public.properties for select to anon,authenticated using(active=true);
   grant select(id,active) on public.properties to anon,authenticated;''')
  sql((site/'supabase/migrations/202610090001_public_media_manifest.sql').read_text())
  url='https://tnkiwgewdancvmkhzlwz.supabase.co/storage/v1/object/public/property-photos/property-1/revision-1/00-'+'a'*64+'.webp'
  valid={'version':1,'cover_media_id':'photo','items':[{'id':'photo','type':'image','url':url}]}
  variants=[None,valid,{}, {'version':'1',**{k:v for k,v in valid.items() if k!='version'}}, {'version':True,**{k:v for k,v in valid.items() if k!='version'}}, {**valid,'items':[{'id':'photo','type':'image'}]}, {**valid,'private_notes':'private'}, {**valid,'cover_media_id':'x'}, {**valid,'items':[{**valid['items'][0],'source_url':'private'}]}, {**valid,'items':[{**valid['items'][0],'url':'https://evil.example/photo.jpg'}]}, {**valid,'items':[{**valid['items'][0],'id':'bad id'}],'cover_media_id':'bad id'}]
  variants += [{**valid,'items':[{**valid['items'][0],'type':None}]},
    {**valid,'items':[{**valid['items'][0],'url':url.replace('.webp','.mp4')}]},
    {**valid,'items':[{**valid['items'][0],'type':'video','poster_url':url,'fallback_url':url}]},
    {**valid,'items':[{**valid['items'][0],'type':'video','url':url.replace('.webp','.mp4'),'poster_url':url.replace('.webp','.mp4'),'fallback_url':url}]},
    {**valid,'items':[valid['items'][0],valid['items'][0]]}]
  observed=[]
  for value in variants:
   text='null' if value is None else "'"+json.dumps(value).replace("'","''")+"'::jsonb"
   observed.append(sql('select public.valid_property_media_manifest('+text+');').stdout.strip())
  expected=['t','t']+['f']*(len(variants)-2)
  assert observed==expected,{'observed':observed,'expected':expected}
  video={**valid,'items':[{**valid['items'][0],'type':'video','url':url.replace('.webp','.mp4'),'poster_url':url,'fallback_url':url}]}
  assert sql("select public.valid_property_media_manifest('"+json.dumps(video)+"'::jsonb);").stdout.strip()=='t'
  sql("insert into public.properties values(1,true,'private-office', '"+json.dumps(valid)+"'::jsonb),(2,false,'hidden-office',null);")
  assert sql('set role anon;select id from public.properties;').stdout.strip()=='SET\n1'
  assert sql('set role anon;select office_property_id from public.properties;',check=False).returncode!=0
  assert sql('set role anon;update public.properties set active=false;',check=False).returncode!=0
  result={'migration_applied_to_isolated_postgres':True,'manifest_cases':len(variants),'public_active_rows_only':True,'private_columns_denied':True,'anonymous_writes_denied':True}
  print(json.dumps(result))
 finally:run([bin/'pg_ctl','-D',data,'-m','fast','-w','stop'])

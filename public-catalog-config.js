// Public-only temporary delivery configuration. No private publisher credentials.
(function(root){
  'use strict';
  const origin='https://mavo-catalog-pilot-20261011.maor-bezalel.workers.dev';
  root.MAVO_CATALOG_PROVIDER='cloudflare';
  root.MAVO_CATALOG_API_ORIGIN=origin;
  root.MAVO_PUBLIC_MEDIA_DELIVERY_ORIGIN=origin;
})(window);

/**
 * Resolve provided relative asset url and return the resolved asset url.
 * This utility function is introduced to replace the usage of require.context to resolve an asset url dynamically.
 * Following code relying on webpack's require.context,
 * const resolvedUrl = require.context('@/assets/')('./' + assetUrl);
 * can be translated into
 * const resolvedUrl = resolveAssetUrl(assetUrl);
 * @param url relative asset url
 */
export const resolveAssetUrl = (url: string) => {
  const assetUrls = Object.keys(import.meta.glob('@/assets/**/*'));
  const match = assetUrls.find((path) => path.endsWith('assets/' + url));
  if (!match) {
    throw new Error('Failed to resolve asset url, ' + url);
  }
  return match;
};

const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

const listCountries = async (sortAsc = true) => {
  const regionsAdapter = Adapter.get(RESOURCE.REGIONS);

  const countryList = await regionsAdapter.countries();
  const sortedCountryList = [...countryList.sort()];
  if (!sortAsc) {
    return [...countryList.reverse()];
  }
  return sortedCountryList;
};

module.exports = {
  listCountries,
};

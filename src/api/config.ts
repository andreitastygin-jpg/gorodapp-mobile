export const PROD_API_BASE_URL = 'https://api.gorodapp.ru';

const getApiBaseUrl = () => {
  // Direct base URL for the native application without local proxying logic
  return PROD_API_BASE_URL;
};

export const API_BASE_URL = getApiBaseUrl();

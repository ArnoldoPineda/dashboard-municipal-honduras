// src/services/mongoClient.ts

export const getMunicipalities = async () => {
  try {
    const response = await fetch('/.netlify/functions/api/municipalities');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching municipalities:', error);
    throw error;
  }
};
export const getMunicipalityDetail = async (
  municipioName?: string,
  year?: number,
  departmentName?: string
) => {
  try {
    const allData = await getMunicipalities();
    
    let filtered = allData;
    
    if (municipioName) {
      filtered = filtered.filter((m: any) => m.name === municipioName);
    }
    
    if (year) {
      filtered = filtered.filter((m: any) => m.year === year);
    }
    
    if (departmentName) {
      filtered = filtered.filter((m: any) => m.department === departmentName);
    }
    
    return filtered.length > 0 ? filtered[0] : null;
  } catch (error) {
    console.error('Error fetching municipality detail:', error);
    throw error;
  }
};
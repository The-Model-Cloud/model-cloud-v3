import Papa from "papaparse";

export default function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = Object.keys(results.data[0]).map((key) => ({
          Header: key,
          accessor: key,
        }));
        resolve({
          columns,
          rows: results.data,
        });
      },
      error: (error) => reject(error),
    });
  });
}

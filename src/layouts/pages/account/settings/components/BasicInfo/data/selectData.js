// src/layouts/pages/account/settings/components/BasicInfo/data/selectData.js

// Calculate years from 1950 to (currentYear - 17)
const currentYear = new Date().getFullYear();
const startYear = currentYear - 80;
const endYear = currentYear - 17;

const years = [];

for (let y = startYear; y <= endYear; y++) {
  years.push(y.toString());
}


const selectData = {
  gender: ["Woman", "Man", "Transwoman", "Transman", "Non-binary person", "Other"],
  birthDate: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  days: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
  years, // ✅ dynamically generated

  skills: [
    "Qualified Personal Trainer", "Influencer", "Yoga", "Editorial/Commercial", "Athlete",
    "Fitness", "Curve", "Petite", "Disabled"
  ],

  languages: [
    "English", "Italian", "French", "Spanish", "Albanian", "Arabic", "Armenian", "Azerbaijani",
    "Basque", "Bosnian", "Breton", "Bulgarian", "Catalan", "Chinese", "Corsican", "Croatian",
    "Czech", "Danish", "Dutch", "Estonian", "Finnish", "Galician", "Georgian", "German",
    "Greek", "Hungarian", "Irish", "Japanese", "Latvian", "Lithuanian", "Luxembourgish",
    "Macedonian", "Maltese", "Montenegrin", "Norwegian", "Polish", "Portuguese", "Romanian",
    "Russian", "Serbian", "Slovak", "Slovenian", "Swedish", "Turkish", "Ukrainian"
  ],
};

export default selectData;

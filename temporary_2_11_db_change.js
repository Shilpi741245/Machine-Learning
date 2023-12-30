// // it is used to add the time column to the database

// const sqlite3 = require('sqlite3').verbose();

// let db = new sqlite3.Database('./chat.db', (err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Connected to the my_database database.');
// });

// db.serialize(() => {
//   db.run(`ALTER TABLE chat_messages ADD COLUMN time TEXT`, function(err) {
//     if (err) {
//       return console.error(err.message);
//     }
//     console.log("New column has been added");
//   });
// });

// db.close((err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log('Close the database connection.');
// });

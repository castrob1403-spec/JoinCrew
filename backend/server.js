const express = require("express");
const sqlite3 = require("sqlite3").verbose();


const app = express();


// Permite recibir datos JSON
app.use(express.json());



// Crear base de datos

const db = new sqlite3.Database("usuarios.db");



// Crear tabla usuarios

db.run(`
CREATE TABLE IF NOT EXISTS usuarios(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    correo TEXT UNIQUE,
    password TEXT
)
`);



app.get("/", (req,res)=>{
    res.send("Servidor funcionando 🔥");
});



app.listen(3000, ()=>{
    console.log("Servidor iniciado en puerto 3000");
});
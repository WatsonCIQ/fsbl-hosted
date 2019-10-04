const express = require("express");
const app = express();
const port = 3375;

app.use(express.static("dist"));

app.listen(port, () => console.log(`Server listening on port ${port}!`));

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('XoptYmiZ Test Server Working');
});

app.listen(3000, () => {
    console.log('Minimal server: http://localhost:3000');
});

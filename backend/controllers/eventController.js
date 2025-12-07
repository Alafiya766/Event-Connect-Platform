const db = require("../db");

exports.getEvents = (req,res)=>{
  db.query("SELECT * FROM events",(err,result)=>{
    if(err) return res.status(500).json(err);
    res.json(result);
  });
};

exports.createEvent = (req,res)=>{
  const {title,description,event_date,location,price,organizer_id} = req.body;
  db.query("INSERT INTO events (title,description,event_date,location,price,organizer_id) VALUES (?,?,?,?,?,?)",
  [title,description,event_date,location,price,organizer_id],
  (err,result)=>{
    if(err) return res.status(500).json(err);
    res.json({message:"Event created"});
  });
};

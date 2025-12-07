const db = require("../db");
exports.registerForEvent = (req,res)=>{
  const {user_id,event_id} = req.body;
  db.query("INSERT INTO registrations (user_id,event_id) VALUES (?,?)",[user_id,event_id],
  (err,result)=>{
    if(err) return res.status(500).json(err);
    res.json({message:"Registered for event"});
  });
};

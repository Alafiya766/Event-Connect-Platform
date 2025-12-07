const API = "http://localhost:5000";
let selectedEventId = null;

// Load Events
async function loadEvents(){
  const res = await fetch(`${API}/events`);
  const data = await res.json();
  const eventList = document.getElementById("eventList");
  if(eventList){
    eventList.innerHTML = data.map(e=>`
      <div class="card">
        <h3>${e.title}</h3>
        <p>${e.description}</p>
        <p><b>${e.location}</b> — ${e.event_date}</p>
        <p>₹${e.price}</p>
        <button onclick="openModal(${e.event_id})">Register</button>
        <button onclick="payNow(${e.event_id},${e.price},'user@example.com')">Pay Now</button>
      </div>`).join("");
  }
}
loadEvents();

// Modal
function openModal(eventId){ selectedEventId = eventId; document.getElementById("regModal").style.display="flex"; }
function closeModal(){ document.getElementById("regModal").style.display="none"; }

async function confirmRegistration(){
  const email = document.getElementById("regEmail").value;
  if(!email) return alert("Enter email");
  const res = await fetch(`${API}/register`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:1,event_id:selectedEventId})
  });
  const data = await res.json();
  alert(data.message);
  closeModal();
}

// Auth
async function login(){
  const email=document.getElementById("email").value;
  const password=document.getElementById("password").value;
  const res = await fetch(`${API}/auth/login`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });
  const data = await res.json();
  alert(data.message || "Login successful");
}

async function register(){
  const name=document.getElementById("name").value;
  const email=document.getElementById("email").value;
  const password=document.getElementById("password").value;
  const role=document.getElementById("role").value;
  const res = await fetch(`${API}/auth/register`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,email,password,role})
  });
  const data = await res.json();
  alert(data.message || "Registered");
}

// Event creation
async function createEvent(){
  const title=document.getElementById("title").value;
  const description=document.getElementById("description").value;
  const event_date=document.getElementById("date").value;
  const location=document.getElementById("location").value;
  const price=document.getElementById("price").value;
  const res = await fetch(`${API}/events/create`,{
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({title,description,event_date,location,price,organizer_id:1})
  });
  const data = await res.json();
  alert(data.message);
}

// Dashboard
async function loadDashboard(){
  const resEvents = await fetch(`${API}/events`);
  const events = await resEvents.json();

  const statsCards = document.getElementById("statsCards");
  if(statsCards){
    const totalEvents = events.length;
    const totalRegistrations = events.reduce((acc,e)=>acc + Math.floor(Math.random()*10),0);
    const totalPayments = events.reduce((acc,e)=>acc + Math.floor(Math.random()*1000),0);

    statsCards.innerHTML = `
      <div class="dashboard-card">
        <h3>Total Events</h3>
        <p>${totalEvents}</p>
      </div>
      <div class="dashboard-card">
        <h3>Total Registrations</h3>
        <p>${totalRegistrations}</p>
      </div>
      <div class="dashboard-card">
        <h3>Total Payments</h3>
        <p>₹${totalPayments}</p>
      </div>`;
  }

  const myEvents = document.getElementById("myEvents");
  if(myEvents){
    myEvents.innerHTML = events.map(e=>`
      <div class="card">
        <h3>${e.title}</h3>
        <p>${e.description}</p>
        <p><b>${e.location}</b> — ${e.event_date}</p>
        <p>₹${e.price}</p>
      </div>
    `).join("");
  }

  const ctx = document.getElementById('regChart')?.getContext('2d');
  if(ctx){
    new Chart(ctx,{
      type:'bar',
      data:{
        labels: events.map(e=>e.title),
        datasets:[{
          label:'Registrations',
          data: events.map(e=>Math.floor(Math.random()*20)),
          backgroundColor:'rgba(25,118,210,0.7)'
        }]
      },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });
  }
}

if(document.getElementById("statsCards")) loadDashboard();

// Razorpay Payment
function payNow(eventId, price, userEmail){
  const options = {
    key: "YOUR_RAZORPAY_KEY",
    amount: price*100,
    currency: "INR",
    name: "Event Management",
    description: "Event Payment",
    handler: async function(response){
      const res = await fetch(`${API}/payment/verify`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          user_id:1,
          event_id:eventId,
          amount:price,
          email:userEmail
        })
      });
      const data = await res.json();
      alert(data.message);
    }
  };
  const rzp = new Razorpay(options);
  rzp.open();
}
async function loadDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "organizer") return;

  const statsCards = document.getElementById("statsCards");
  if (statsCards) {
    statsCards.innerHTML = `
        <div class="dashboard-card">
          <h3>Total Events</h3>
          <p>Loading...</p>
        </div>

        <div class="dashboard-card">
          <h3>Total Registrations</h3>
          <p>Loading...</p>
        </div>

        <div class="dashboard-card">
          <h3>Total Revenue</h3>
          <p>₹0</p>
        </div>
    `;
  }

  loadMyEvents();
}

async function loadMyEvents() {
  const container = document.getElementById("myEvents");
  if (!container) return;

  const res = await fetch(`${API}/events`);
  const data = await res.json();

  const user = JSON.parse(localStorage.getItem("user"));

  const events = data.filter((e) => e.organizer_id == user.user_id);

  container.innerHTML = events
    .map(
      (e) => `
      <div class="card">
        <h3>${e.title}</h3>
        <p>${e.description}</p>
        <p>${e.event_date} | ${e.location}</p>
        <p>₹${e.price}</p>
      </div>
    `
    )
    .join("");
}

loadDashboard();
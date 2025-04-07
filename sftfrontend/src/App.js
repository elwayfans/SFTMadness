/*
Use the naming convention as you see below so that these routes can stay clean. 
To do list:
Hook up routes 
Make navbar ----
*/
import './App.css';
import './components/navbar/NavBar.js'
import './components/about_contact_us/Info.js'

function App() {
  return (
    <Router>
      <div>
        <NavBar />
        <Routes>
          <Route path="/" exact element={<Home />} />
          <Route path="/aboutus" exact element={<Info />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

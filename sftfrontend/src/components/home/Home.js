/*
✖add information box at top

✔add login and registration button in middle

✖add information box at bottom
*/
import React from 'react'
import { useNavigate } from "react-router-dom"
import './Home.css'

const Home = () => {
    const navigate = useNavigate();
    return (
        <div className='homeBody'>
            <p>
                Since 1992, we've been leading the charge in transforming how
                prospective students find, learn, and enroll in programs. In
                today's competitive educational landscape, schools are constantly
                striving to attract more students. <br /><br />
                Yet, many overlook a critical aspect: The admissions process.<br /><br />
                It's here that interested students often get stuck in inefficient
                stages, leading to missed opportunities, lower conversion rates and
                lower enrollment.<br /><br />
                That's where we come in.
            </p>
            <div>
                <button onClick={() => navigate('/login')}>Login</button>
                <button onClick={() => navigate('/register')} >Register</button>
            </div>
            <p>
                We're dedicated to making the world a better place, one student at a time.
                By helping schools, supporting employees, and guiding students toward success,
                we're contributing to a greater mission of positive change.<br /><br />
                We're committed to helping you win and drive real engagement with your audience.
            </p>
        </div>
    )
}

export default Home
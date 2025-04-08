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
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus
                imperdiet, nulla et dictum interdum, nisi lorem egestas odio, vitae
                scelerisque enim ligula venenatis dolor. Maecenas nisl est, ultrices
                nec congue eget, auctor vitae massa. Fusce luctus vestibulum augue ut
                aliquet. Nunc sagittis dictum nisi, sed ullamcorper ipsum dignissim ac.
                In at libero sed nunc venenatis imperdiet sed ornare turpis. Donec vitae
                dui eget tellus gravida venenatis. Integer fringilla congue eros non fermentum.
            </p>
            <div>
                <button onClick={() => navigate('/login')}>Login</button>
                <button onClick={() => navigate('/register')} >Register</button>
            </div>
            <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus
                imperdiet, nulla et dictum interdum, nisi lorem egestas odio, vitae
                scelerisque enim ligula venenatis dolor. Maecenas nisl est, ultrices
                nec congue eget, auctor vitae massa. Fusce luctus vestibulum augue ut
                aliquet. Nunc sagittis dictum nisi, sed ullamcorper ipsum dignissim ac.
                In at libero sed nunc venenatis imperdiet sed ornare turpis. Donec vitae
                dui eget tellus gravida venenatis. Integer fringilla congue eros non fermentum.
            </p>
        </div>
    )
}

export default Home
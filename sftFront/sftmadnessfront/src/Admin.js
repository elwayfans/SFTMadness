import AdminRegister from "./components/AdminRegister";
import AdminLogIn from "./components/AdminLogin";
import React, { useState, useEffect } from 'react';

import AdminDashboard from "./components/adminDashboard";

function Admin()
{
    const [showAdminRegister, setShowAdminRegister] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    if(!isAuthenticated){
        return(
            <div id="admin Login">
                {showAdminRegister ?(
                    <>
                    <AdminRegister/>
                    <button id="RegisterButton" onClick={() => {
                            setShowAdminRegister(false);
                        }}>
                      Log In
                    </button>
                    </>
                ):<>
                <AdminLogIn/>
                <button id="RegisterButton" onClick={() => {
                            setShowAdminRegister(true);
                        }}>
                      Log In
                    </button>
                <AdminDashboard/>
                </>
                
                
                }
            
            </div>
        )

    }
   

}

export default Admin;
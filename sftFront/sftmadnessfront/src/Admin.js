import AdminRegister from "./components/AdminRegister";
import AdminLogIn from "./components/AdminLogin";
import React, { useState } from 'react';

function Admin()
{
    const [showAdminRegister, setShowAdminRegister] = useState(false);
    const [isAuthenticated] = useState(false);
    
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
                
                </>
                
                
                }
            
            </div>
        )

    }
   

}

export default Admin;
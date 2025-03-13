import React, { Fragment,Component } from 'react'

import { Helmet } from 'react-helmet'



import Slider from '@mui/material/Slider';
import './DataTakeIn.css'
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';


import axios from "axios";


class App extends Component {
    state = {
        // Initially, no file is selected
        selectedFile: null
    };
   

    // On file select (from the pop up)
    onFileChange = (event) => {
        // Update the state
        this.setState({
            selectedFile: event.target.files[0]
        });
    };

    // On file upload (click the upload button)
    onFileUpload = () => {
        // Create an object of formData
        const formData = new FormData();

        // Update the formData object
        formData.append(
            "myFile",
            this.state.selectedFile,
            this.state.selectedFile.name
        );

        // Details of the uploaded file
        console.log(this.state.selectedFile);

        // Request made to the backend api
        // Send formData object
        axios.post("api/uploadfile", formData);
    };

    // File content to be displayed after
    // file upload is complete
    fileData = () => {
        if (this.state.selectedFile) {
            return (
                <div>
                    <h2>File Details:</h2>
                    <p>File Name: {this.state.selectedFile.name}</p>

                    <p>File Type: {this.state.selectedFile.type}</p>

                    <p>
                        Last Modified:
                        {this.state.selectedFile.lastModifiedDate.toDateString()}
                    </p>
                </div>
            );
        } else {
            return (
                <div>
                    <br />
                    <h4>Choose before Pressing the Upload button</h4>
                </div>
            );
        }
    };
    
    

    render() {
        return (
          <div className="home-container">
          <Helmet>
            <title>Squiggly Accurate Finch</title>
            <meta property="og:title" content="Squiggly Accurate Finch" />
          </Helmet>
        
    
          <div className='Bot Data'>
            <div className='BotName'>
              <h3>Name Your Bot</h3>
                <input></input>
                <button className='SubminBtn'>Submit</button>
            </div>
            <div className='EmailData'>
              <h1>Email File</h1>
                <h3>NOTE!:This file has to be in json formt</h3>
                <div>
                  <input type="file" onChange={this.onFileChange} />
                  <button onClick={this.onFileUpload} className='SubminBtn'>Upload!</button>
                </div>
                {this.fileData()}
            </div>
            <div className='WebPages'>
              <h2>Give your bot webistes to use</h2>
              <a>Url Link</a>
              <input></input>
              <button className='SubminBtn'>Submit</button>
            </div>
            
            <div className='FileInTake'>
            <h3>Documents</h3>
                <div>
                  <input type="file" onChange={this.onFileChange} />
                  <button onClick={this.onFileUpload} className='SubminBtn'>Upload!</button>
                </div>
                {this.fileData()}
            </div>

            <div className='Slider'>
            <Slider
            defaultValue={70}
            valueLabelDisplay="auto"
            />
            </div>
            <div className='DropDown'>
         
            </div>
          
          </div>          
        </div>
        );
    }
}



export default App
import React, { Fragment } from 'react'

import PropTypes from 'prop-types'

import './AdminLogIn.css'


const AdminLogIn = (props) => {
    return (
      <div className="sign-in10-container1 thq-section-padding">
        <div className="sign-in10-max-width thq-section-max-width">
          <div className="sign-in10-container2 thq-section-padding">
            <div className="sign-in10-form1">
              <div className="sign-in10-container3">
                <h2 className="thq-heading-2 sign-in10-text10">
                  {props.heading1 ?? (
                    <Fragment>
                      <span className="sign-in10-text25">Sign In</span>
                    </Fragment>
                  )}
                </h2>
                <p className="thq-body-large">
                  {props.content1 ?? (
                    <Fragment>
                      <span className="sign-in10-text26">
                        Already have an account? Sign in here.
                      </span>
                    </Fragment>
                  )}
                </p>
              </div>
              <form className="sign-in10-form2">
                <div className="sign-in10-email">
                  <label
                    htmlFor="thq-sign-in-10-email"
                    className="thq-body-large"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="thq-sign-in-10-email"
                    required="true"
                    placeholder="Email address"
                    className="sign-in10-textinput1 thq-input thq-body-large"
                  />
                </div>
                <div className="sign-in10-password">
                  <div className="sign-in10-textfield">
                    <div className="sign-in10-container4">
                      <label
                        htmlFor="thq-sign-in-10-password"
                        className="thq-body-large"
                      >
                        Password
                      </label>
                      <div className="sign-in10-hide-password">
                        <svg viewBox="0 0 1024 1024" className="sign-in10-icon1">
                          <path d="M317.143 762.857l44.571-80.571c-66.286-48-105.714-125.143-105.714-206.857 0-45.143 12-89.714 34.857-128.571-89.143 45.714-163.429 117.714-217.714 201.714 59.429 92 143.429 169.143 244 214.286zM539.429 329.143c0-14.857-12.571-27.429-27.429-27.429-95.429 0-173.714 78.286-173.714 173.714 0 14.857 12.571 27.429 27.429 27.429s27.429-12.571 27.429-27.429c0-65.714 53.714-118.857 118.857-118.857 14.857 0 27.429-12.571 27.429-27.429zM746.857 220c0 1.143 0 4-0.571 5.143-120.571 215.429-240 432-360.571 647.429l-28 50.857c-3.429 5.714-9.714 9.143-16 9.143-10.286 0-64.571-33.143-76.571-40-5.714-3.429-9.143-9.143-9.143-16 0-9.143 19.429-40 25.143-49.714-110.857-50.286-204-136-269.714-238.857-7.429-11.429-11.429-25.143-11.429-39.429 0-13.714 4-28 11.429-39.429 113.143-173.714 289.714-289.714 500.571-289.714 34.286 0 69.143 3.429 102.857 9.714l30.857-55.429c3.429-5.714 9.143-9.143 16-9.143 10.286 0 64 33.143 76 40 5.714 3.429 9.143 9.143 9.143 15.429zM768 475.429c0 106.286-65.714 201.143-164.571 238.857l160-286.857c2.857 16 4.571 32 4.571 48zM1024 548.571c0 14.857-4 26.857-11.429 39.429-17.714 29.143-40 57.143-62.286 82.857-112 128.571-266.286 206.857-438.286 206.857l42.286-75.429c166.286-14.286 307.429-115.429 396.571-253.714-42.286-65.714-96.571-123.429-161.143-168l36-64c70.857 47.429 142.286 118.857 186.857 192.571 7.429 12.571 11.429 24.571 11.429 39.429z"></path>
                        </svg>
                        <span className="thq-body-small">Hide</span>
                      </div>
                    </div>
                    <input
                      type="password"
                      id="thq-sign-in-10-password"
                      required="true"
                      placeholder="Password"
                      className="sign-in10-textinput2 thq-input thq-body-large"
                    />
                  </div>
                  <a
                    href="https://teleporthq.io/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="sign-in10-link thq-body-small"
                  >
                    Forgot password
                  </a>
                </div>
              </form>
              <button
                type="submit"
                className="sign-in10-button1 thq-button-filled"
              >
                <span className="sign-in10-text15 thq-body-small">
                  {props.action1 ?? (
                    <Fragment>
                      <span className="sign-in10-text23">Submit</span>
                    </Fragment>
                  )}
                </span>
              </button>
              <div className="sign-in10-divider1">
                <div className="sign-in10-divider2"></div>
                <p className="thq-body-large">OR</p>
                <div className="sign-in10-divider3"></div>
              </div>
              <div className="sign-in10-container5">             
                <button className="sign-in10-button3 thq-button-outline">
                  <svg viewBox="0 0 1024 1024" className="sign-in10-icon5">
                    <path d="M522.2 438.8v175.6h290.4c-11.8 75.4-87.8 220.8-290.4 220.8-174.8 0-317.4-144.8-317.4-323.2s142.6-323.2 317.4-323.2c99.4 0 166 42.4 204 79l139-133.8c-89.2-83.6-204.8-134-343-134-283 0-512 229-512 512s229 512 512 512c295.4 0 491.6-207.8 491.6-500.2 0-33.6-3.6-59.2-8-84.8l-483.6-0.2z"></path>
                  </svg>
                  <span className="thq-body-small">Google</span>
                </button>
              </div>
            </div>
          </div>
          <div className="sign-in10-container6 thq-section-padding">
            <div className="sign-in10-container7">
              <h2 className="thq-heading-2">
                {props.heading2 ?? (
                  <Fragment>
                    <span className="sign-in10-text22">Forgot Password?</span>
                  </Fragment>
                )}
              </h2>
              <p className="thq-body-large">
                {props.content2 ?? (
                  <Fragment>
                    <span className="sign-in10-text24">
                      Forgot your password? No worries, you can reset it here.
                    </span>
                  </Fragment>
                )}
              </p>
            </div>
            <button type="submit" className="sign-in10-button4 thq-button-filled">
              <span className="sign-in10-text21 thq-body-small">
                {props.action2 ?? (
                  <Fragment>
                    <span className="sign-in10-text27">Reset Password</span>
                  </Fragment>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  AdminLogIn.defaultProps = {
    heading2: undefined,
    action1: undefined,
    content2: undefined,
    heading1: undefined,
    content1: undefined,
    action2: undefined,
  }
  
  AdminLogIn.propTypes = {
    heading2: PropTypes.element,
    action1: PropTypes.element,
    content2: PropTypes.element,
    heading1: PropTypes.element,
    content1: PropTypes.element,
    action2: PropTypes.element,
  }
  
  export default AdminLogIn
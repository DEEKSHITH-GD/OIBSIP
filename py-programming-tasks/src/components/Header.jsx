import React, {Component} from 'react'

class Header extends Component{
    render(){
        return(
            <header>
                <nav className='nav navbar-expand-md navbar-dark bg-dark'>
                    <div className='links'><a href="https://github.com/DEEKSHITH-GD" className='navbar-link'>GitHub</a></div>
                    <div className='links'><a href="https://www.linkedin.com/in/deekshith-g-d-4ab9ba241" className='navbar-link'>LinkedIn</a></div>
                    <div className='navbar-nav navbar-collapse justify-content-end text-white'>
                        Oasis Infobyte Internship - Deekshith G D
                    </div>
                </nav>
            </header>
        )
    }
}

export default Header
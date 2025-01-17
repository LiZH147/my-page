import React from 'react'
import { NavLink } from 'react-router-dom'

export default function SiderLink({ path }) {

    return (
        <div style={{width: 222, height: 35}}>
            <NavLink style={{ color: 'black', textDecoration: 'none' }} to={`/${path}`}>
            {!path ? 'All' : path}
            </NavLink>
        </div>
    )
}

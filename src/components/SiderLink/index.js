import React from 'react'
import { Link } from 'react-router-dom'

export default function SiderLink({ path }) {

    return (
        <div style={{width: 222, height: 35}}>
            <Link to={`/${path}`}>{path}</Link>
        </div>
    )
}

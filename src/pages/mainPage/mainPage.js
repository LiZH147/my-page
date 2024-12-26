import React from 'react'
import { Routes, Route } from "react-router-dom";
import MainCpn from '../../components/MainCpn'
import SiderCpn from '../../components/SiderCpn'
import HeaderCpn from '../../components/HeaderCpn'
import ContentPage from '../contentPage'

export default function MainPage() {
  return (
    <>
      <HeaderCpn />
      <div style={{ display: 'flex', width: '80%', margin: '0 auto' }}>
        <SiderCpn />
        <div style={{ flexGrow: 3.5 }}>
          <Routes>
            <Route path='/' element={<MainCpn />} />
            <Route path='/detail/:id' element={<ContentPage />} />
          </Routes>
        </div>
      </div>
    </>
  )
}

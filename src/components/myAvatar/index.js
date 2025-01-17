import React, { useState } from 'react'
import { Avatar, Modal } from "antd";
import './index.css'

export default function MyAvatar(props) {

    const goToLink = () => {
        window.open(props.link, '_blank')
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleCancel = (e) => {
        e.stopPropagation()
        setIsModalOpen(false);
    };
    const show2Code = () => {
        setIsModalOpen(true);

    }

    return (
        <div className='main' onClick={props.title === '即刻' || 'GitHub' ? goToLink : show2Code } >
            <Avatar size={32} src={props.avatarSrc} />
            {/* <span style={{marginLeft: '8px'}}>{props.title}</span> */}
            <Modal title={props.title} open={isModalOpen} footer={null} onCancel={handleCancel}>
                <img alt={props.title} style={{width: '100%'}} src={props.modalSrc} />
            </Modal>
        </div>
    )
}

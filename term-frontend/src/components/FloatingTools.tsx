// src/components/FloatingTools.tsx
import React from 'react';
import { FloatButton, message } from 'antd';
import { 
  SmileOutlined, 
  UserOutlined, 
  MoonOutlined, 
  FontSizeOutlined, 
  MessageOutlined 
} from '@ant-design/icons';
import { useChildMode } from '../context/ChildModeContext';

const FloatingTools: React.FC = () => {
  const { isChildMode, toggleChildMode } = useChildMode();

  const handleComingSoon = (feature: string) => {
    message.info(`${feature}功能正在建设中，敬请期待～`);
  };

  return (
    <FloatButton.Group shape="circle" style={{ right: 24, top: 200 }}>
      <FloatButton
        icon={<SmileOutlined />}
        type={isChildMode ? 'primary' : 'default'}
        onClick={toggleChildMode}
        tooltip={isChildMode ? '关闭儿童模式' : '开启儿童模式'}
      />
      <FloatButton
        icon={<UserOutlined />}
        onClick={() => handleComingSoon('老年模式')}
        tooltip="老年模式"
      />
      <FloatButton
        icon={<MoonOutlined />}
        onClick={() => handleComingSoon('夜间模式')}
        tooltip="夜间模式"
      />
      <FloatButton
        icon={<FontSizeOutlined />}
        onClick={() => handleComingSoon('字体缩放')}
        tooltip="字体放大缩小"
      />
      <FloatButton
        icon={<MessageOutlined />}
        onClick={() => handleComingSoon('意见反馈')}
        tooltip="意见反馈"
      />
    </FloatButton.Group>
  );
};

export default FloatingTools;
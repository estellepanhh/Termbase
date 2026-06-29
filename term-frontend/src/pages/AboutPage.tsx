import React from 'react';
import { Typography, Card } from 'antd';
const { Title, Paragraph } = Typography;

const AboutPage: React.FC = () => {
    return (
        <div style={{ padding: '60px 30px', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ maxWidth: 800, width: '100%' }}>
                <Title level={2}>关于我们</Title>
                <Paragraph>
                    中国特色话语多语术语库是一个致力于整理、展示和传播中华文化核心术语的知识平台。
                </Paragraph>
                <Paragraph>
                    本项目为大学生创新创业训练计划项目成果，旨在通过数字化手段提升中华文化的国际传播效能。
                </Paragraph>
                <Title level={4}>技术栈</Title>
                <Paragraph>前端：React + TypeScript + Vite + Ant Design + i18next</Paragraph>
                <Paragraph>后端：Flask + MySQL + 豆包大模型（火山方舟）</Paragraph>
                
            </Card>
        </div>
    );
};

export default AboutPage;
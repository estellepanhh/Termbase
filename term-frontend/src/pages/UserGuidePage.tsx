import React from 'react';
import { Typography, Card } from 'antd';
const { Title, Paragraph } = Typography;

const UserGuidePage: React.FC = () => {
    return (
        <div style={{ padding: '60px 30px', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ maxWidth: 800, width: '100%' }}>
                <Title level={2}>使用指南</Title>
                <Paragraph>
                    欢迎使用中国特色话语多语术语库。本系统提供中华文化相关术语的检索、筛选、详情查看以及管理功能。
                </Paragraph>
                <Title level={4}>1. 术语检索</Title>
                <Paragraph>在首页搜索框输入术语名称，点击搜索或按回车键即可快速查找术语。</Paragraph>
                <Title level={4}>2. 分类筛选</Title>
                <Paragraph>您可以通过“文化分类”、“场景分类”、“术语层级”三个下拉框进行多维度筛选，快速定位所需的术语。</Paragraph>
                <Title level={4}>3. 术语详情</Title>
                <Paragraph>点击术语卡片可查看完整信息，包括中英文译法、文化内涵、来源等。</Paragraph>
                <Title level={4}>4. 管理功能</Title>
                <Paragraph>管理员可以新增、编辑和删除术语。新增术语时，术语层级与文化的映射可自动填充。</Paragraph>
                <Title level={4}>5. AI 智能助手</Title>
                <Paragraph>右下角悬浮球可打开 AI 助手，提问任何关于中华文化的问题，获得即时解答。</Paragraph>
            </Card>
        </div>
    );
};

export default UserGuidePage;
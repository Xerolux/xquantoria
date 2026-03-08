import React from 'react';
import { Alert } from 'antd';
import { InfoCircleOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { CalloutBlock as CalloutBlockType } from '../../../types/blocks';
import './BlockComponents.css';

interface CalloutBlockProps {
  block: CalloutBlockType;
}

const VARIANT_CONFIG = {
  info: { type: 'info' as const, icon: <InfoCircleOutlined /> },
  warning: { type: 'warning' as const, icon: <WarningOutlined /> },
  error: { type: 'error' as const, icon: <CloseCircleOutlined /> },
  success: { type: 'success' as const, icon: <CheckCircleOutlined /> },
  neutral: { type: 'info' as const, icon: null },
};

const CalloutBlock: React.FC<CalloutBlockProps> = ({ block }) => {
  const config = VARIANT_CONFIG[block.variant || 'info'];
  
  return (
    <div className="block-callout">
      <Alert
        type={config.type}
        message={block.title}
        description={block.content || 'Click to add callout content...'}
        icon={config.icon}
        showIcon
        closable={block.dismissible}
      />
    </div>
  );
};

export default CalloutBlock;

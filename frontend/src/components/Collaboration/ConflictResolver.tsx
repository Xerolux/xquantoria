import React, { useState, useEffect } from 'react';
import { Alert, Button, Space, Typography, Modal, List, Avatar, Tag } from 'antd';
import {
  WarningOutlined,
  SyncOutlined,
  DownloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ConflictData {
  hasConflict: boolean;
  serverVersion: number;
  operations: Array<{
    operation: string;
    blockId: string;
    data: any;
    userId: number;
    userName: string;
    version: number;
    timestamp: string;
  }>;
}

interface ConflictResolverProps {
  conflict: ConflictData | null;
  onResolve: (strategy: 'server' | 'local' | 'merge') => void;
  onDismiss?: () => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflict,
  onResolve,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (conflict?.hasConflict) {
      setVisible(true);
    }
  }, [conflict]);

  const handleResolve = (strategy: 'server' | 'local' | 'merge') => {
    onResolve(strategy);
    setVisible(false);
  };

  if (!conflict?.hasConflict) {
    return null;
  }

  return (
    <>
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="Conflict Detected"
        description={`The document was modified by another user. Your version is behind by ${
          conflict.operations.length
        } change${conflict.operations.length !== 1 ? 's' : ''}.`}
        action={
          <Button size="small" type="primary" onClick={() => setVisible(true)}>
            Resolve
          </Button>
        }
        style={{ marginBottom: 16 }}
      />

      <Modal
        title="Resolve Conflict"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 24 }}>
          <Text>
            The following changes were made by other users while you were editing:
          </Text>
        </div>

        <List
          dataSource={conflict.operations}
          renderItem={(op) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar>{op.userName[0]}</Avatar>}
                title={
                  <Space>
                    <Text strong>{op.userName}</Text>
                    <Tag>{op.operation}</Tag>
                  </Space>
                }
                description={`Block: ${op.blockId.slice(0, 8)}...`}
              />
            </List.Item>
          )}
          style={{ maxHeight: 300, overflow: 'auto', marginBottom: 24 }}
        />

        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={5}>How would you like to resolve this?</Title>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              block
              icon={<DownloadOutlined />}
              onClick={() => handleResolve('server')}
            >
              Use Server Version (Discard my changes)
            </Button>

            <Button
              block
              icon={<UndoOutlined />}
              onClick={() => handleResolve('local')}
            >
              Keep My Version (Overwrite server)
            </Button>

            <Button
              block
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => handleResolve('merge')}
            >
              Attempt Merge (Combine changes)
            </Button>
          </Space>
        </Space>
      </Modal>
    </>
  );
};

export default ConflictResolver;

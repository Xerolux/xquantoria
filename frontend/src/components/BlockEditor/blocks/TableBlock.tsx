import React from 'react';
import { Table } from 'antd';
import { TableBlock } from '../../../types/blocks';
import './BlockComponents.css';

interface TableBlockProps {
  block: TableBlock;
}

const TableBlock: React.FC<TableBlockProps> = ({ block }) => {
  const columns = block.rows[0]?.map((cell, index) => ({
    title: block.hasHeader ? cell : `Column ${index + 1}`,
    dataIndex: index,
    key: index,
  })) || [];

  const dataSource = (block.hasHeader ? block.rows.slice(1) : block.rows).map((row, rowIndex) => ({
    key: rowIndex,
    ...row.reduce((acc, cell, cellIndex) => ({ ...acc, [cellIndex]: cell }), {}),
  }));

  return (
    <div className="block-table">
      {block.caption && <p className="table-caption">{block.caption}</p>}
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        bordered={block.bordered}
        size="small"
      />
    </div>
  );
};

export default TableBlock;

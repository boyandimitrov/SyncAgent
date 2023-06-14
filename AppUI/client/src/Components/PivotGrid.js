import React from 'react';
import {Table} from 'antd';
 
export default class PivotGrid extends React.Component {
    constructor(props) {
        super(props);

        const schema = this.props.schema;

        let headers = this.props.fields.reduce((accumulator, current) => {
            const header = current.split(".")[1] || current;
            
            accumulator.push(header);
            return accumulator;
        }, [])


        this.state = {
            columns : (headers || []).map((field_name,idx) => {

                let column_definition = {
                   title: (field_name && field_name.replace(/_/, " ").replace(/\b\w/g, l => l.toUpperCase())),
                    dataIndex: field_name,
                    key : field_name
                }

                let col_schema = schema.filter(column => column.name===field_name)[0];    
                if ( col_schema && col_schema.type === 'timestamp') {
                    column_definition['render'] = (record) => {
                        return new Date(record.value).toLocaleDateString()
                    }
                }

                return column_definition;
            })
        };
    }
 
    render(){

        return (
            <Table 
                dataSource={this.props.dataSource} 
                columns={this.state.columns} 
                loading={this.props.loading} 
                onChange={this.props.handleTableChange} 
                pagination={this.props.pagination} 
                rowKey={record => {return record.pk}}/>
        );
    }
}



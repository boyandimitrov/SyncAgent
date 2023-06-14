import React from 'react';
import {Tabs, Row, Col, Divider} from 'antd';
import axios from "axios";
import PivotGrid from './PivotGrid';
import PivotPivot from './PivotPivot';
import { filter } from 'd3';

export default class Pivot extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            loading:false,
            data : [] ,
            pivot_data : [],
            tableParams : {
                pagination : {
                    current: 1,
                    pageSize: 10
                }
            }
        };

        this.handleTabClick = this.handleTabClick.bind(this);
        this.handleTableChange = this.handleTableChange.bind(this);
    }

    getDataPlain() {
        console.log(process.env.REACT_APP_BASE_URL); 
        let query = {
            "dataset" : this.props.ds.dataset,
            "table" : this.props.ds.table,  
            "paging" : {"limit" : this.state.tableParams.pagination.pageSize, "offset" : this.state.tableParams.pagination.pageSize * (this.state.tableParams.pagination.current -1)},
            fields : this.props.fields,
            rows_count : true
        }

        if ( this.props.filter ) {
            query.filter = this.props.filter;
        }

        let self = this;
        this.setState({loading:true});
        axios
            .post(`${process.env.REACT_APP_BASE_URL}/query`, query)
            .then((response) => {

                response.data.rows.forEach(item => {
                    item.key = item.property_name
                })

                const data_source = response.data.rows.map((item, idx) => {
                    return {...item, pk : `key_${idx}`}
                })

                let p= [];
                p.push(self.props.fields);
                p = p.concat([...Array(response.data.rows_count)].map(e => [...Array(self.props.fields.length)]));
                this.setState({pivot_data : p, data: data_source, tableParams : {...this.state.tableParams, pagination : {...this.state.tableParams.pagination, total : response.data.rows_count}}, loading:false})
            });
    }

    componentDidMount() {
        this.getDataPlain(); 
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            if ( this.props.filter) {
                this.getDataPlain(); 
            }
        }
        
    }

    handleTabClick (key) {
        console.log(key);
        // if ( key === 'pivot' && this.state.pivot_data.length === 0) {
        //     this.getDataPivot();
        // }
    }

    handleTableChange (pagination, filters, sorter) {
        console.log(pagination, filters, sorter);

        let self = this;
        this.setState({
            tableParams : {
                pagination,
                filters,
                ...sorter,
            }
        }, () => {
            self.getDataPlain()
        })

        //this.getDataPlain();
    }   

    render(){
        return (
            <Tabs type="card" onTabClick={this.handleTabClick} items={
            [
                { label: 'Grid', key: 'grid', children: <PivotGrid dataSource={this.state.data} fields={this.props.fields} schema={this.props.schema} loading={this.state.loading} pagination={this.state.tableParams.pagination} handleTableChange={this.handleTableChange}/> }, // remember to pass the key prop
                { label: 'Pivot', key: 'pivot', children: <PivotPivot ds={this.props.ds} data={this.state.pivot_data}  fields={this.props.fields} schema={this.props.schema} filter={this.props.filter} cbSelectionCreated={this.props.cbSelectionCreated} /> },
            ]} />
        );
    }
}


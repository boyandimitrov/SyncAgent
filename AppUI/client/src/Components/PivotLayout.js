import React from 'react';
import {Tabs, Row, Col, Divider} from 'antd';
import axios from "axios";
import PivotGrid from './PivotGrid';
import PivotPivot from './PivotPivot';

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
        this.cbSelectionCreated = this.cbSelectionCreated.bind(this);
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

        let self = this;
        this.setState({loading:true});
        axios
            .post(`${process.env.REACT_APP_BASE_URL}/query`, query)
            .then((response) => {
                // debugger
                // let headers = self.props.fields.reduce((accumulator, current) => {
                //     const header = current.split(".")[1] || current;
                    
                //     accumulator.push(header);
                //     return accumulator;
                // }, [])

                // let results = [];
                // results.push(headers);

                // response.data.rows.forEach(item => {
                //     results.push(Array.from(Object.values(item)));
                // })

                response.data.rows.forEach(item => {
                    item.key = item.property_name
                })

                const data_source = response.data.rows.map((item, idx) => {
                    return {...item, pk : `key_${idx}`}
                })

                //this.setState({pivot_data : results, data: response.data.results})
                let p= [];
                p.push(self.props.fields);
                p = p.concat([...Array(response.data.rows_count)].map(e => [...Array(self.props.fields.length)]));
                this.setState({pivot_data : p, data: data_source, tableParams : {...this.state.tableParams, pagination : {...this.state.tableParams.pagination, total : response.data.rows_count}}, loading:false})
            });
    }

    getDataPivot() {

    }

    componentDidMount() {
        this.getDataPlain(); 
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

    cbSelectionCreated(filter, aggregation) { 
        this.setState({filter: filter, aggregation:aggregation})
    }

    renderSub() {
        if ( !this.state.filter) {
            return (<div></div>);
        }

        return (
            <Tabs type="card" onTabClick={this.handleTabClick} items={
                [
                    { label: 'Pivot', key: 'pivot', children: <PivotPivot data={this.state.pivot_data}  fields={this.props.fields} schema={this.props.schema} filter={this.state.filter} aggregation={this.state.aggregation} /> },
                ]} />
        )
    }

    render(){

        return (
            <Row>
                <Col span={11}>
                    <Tabs type="card" onTabClick={this.handleTabClick} items={
                    [
                        { label: 'Grid', key: 'grid', children: <PivotGrid dataSource={this.state.data} fields={this.props.fields} schema={this.props.schema} loading={this.state.loading} pagination={this.state.tableParams.pagination} handleTableChange={this.handleTableChange}/> }, // remember to pass the key prop
                        { label: 'Pivot', key: 'pivot', children: <PivotPivot data={this.state.pivot_data}  fields={this.props.fields} schema={this.props.schema} cbSelectionCreated={this.cbSelectionCreated} /> },
                    ]} />
                </Col>
                <Col span={2}>
                    <Divider type='vertical'  style={{ height: "100%", backgroundColor: "#000" }}/>
                </Col>
                <Col span={11}>
                    {this.renderSub()}
                </Col>
            </Row>
        );
    }
}


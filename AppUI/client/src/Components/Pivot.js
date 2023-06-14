import React from 'react';
import {Tabs, Row, Col, Divider} from 'antd';
import axios from "axios";
import PivotControl from './PivotControl';

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

        this.cbSelectionCreated = this.cbSelectionCreated.bind(this);
    }

    cbSelectionCreated(filter, aggregation) { 
        this.setState({filter: filter, aggregation:aggregation})
    }

    renderSub() {
        if ( !this.state.filter) {
            return (<div></div>);
        }

        return (
            <PivotControl 
                fields={this.props.fields} 
                schema={this.props.schema} 
                ds = {this.props.ds}
                filter={this.state.filter} 
                //aggregation={this.state.aggregation}
            />
        )
    }

    render(){

        const span = this.state.filter ? 11 : 24;
        const clsDisplay = this.state.filter ? '' : "hidden";

        return (
            <Row>
                <Col span={span}>
                    <PivotControl 
                        fields={this.props.fields} 
                        schema={this.props.schema} 
                        ds = {this.props.ds}
                        //filter={this.state.filter} 
                        //aggregation={this.state.aggregation}
                        cbSelectionCreated={this.cbSelectionCreated}
                    />
                </Col>
                <Col span={2} className={clsDisplay}>
                    <Divider type='vertical'  style={{ height: "100%", backgroundColor: "#000" }}/>
                </Col>
                <Col span={11} className={clsDisplay}>
                    {this.renderSub()}
                </Col>
            </Row>
        );
    }
}


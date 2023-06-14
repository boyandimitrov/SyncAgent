import React from 'react';
import axios from "axios";
import {Collapse, Layout, Select, Radio } from 'antd';
import PivotWrap from './PivotWrap';
import PivotMap from './PivotMap';
import PivotCities from './PivotCities';
import PivotBar from './PivotBar';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import TableRenderers from "react-pivottable/TableRenderers";
//import Plot from 'react-plotly.js';
//import createPlotlyRenderers from "react-pivottable/PlotlyRenderers";

const { Panel } = Collapse;
const { Header, Footer, Sider, Content } = Layout;

//const PlotlyRenderers = createPlotlyRenderers(Plot);

// const query = {
//     "group" : [
//         {
//             "field" : "property_country"
//         },
//         {
//             "field" : "reservation_season"
//         },
//         {
//             "field" : "consumer_country"
//         }
//     ],
//     "aggregation" : [{
//         "field" : "reservation_price",
//         "formula" : "SUM"
//     }]            
// }
 
export default class PivotPivot extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data : this.props.data,
            pivot : this.props.pivot || {},
            details : [],
            rendererName : 'Table',
            options : (this.props.schema || []).map(({name, type}) => {

                return {
                    label: (name && name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())),
                    value: name
                }
            }),
            slicers : (this.props.schema || [])
                .filter(item => {
                    return item.subtype === 'year'                    
                })
                .map(({name, type}) => {
                    return {
                        label: (name && name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())),
                        value: name
                    }
                }),

            query : {}
        };

        this.aggregation = {
            aggregatorName : 'count',
            aggregatorGridName : 'Count'
        };

        this.handleAbscissaChanged = this.handleAbscissaChanged.bind(this);
        this.handleOrdinateChanged = this.handleOrdinateChanged.bind(this);
        this.handleDetailsChanged = this.handleDetailsChanged.bind(this);
        this.handleAggregatorChanged = this.handleAggregatorChanged.bind(this);
        this.handleAggregatorFieldChanged = this.handleAggregatorFieldChanged.bind(this);
        // this.handlePivotChanged = this.handlePivotChanged.bind(this);
        this.handleSlicerChanged = this.handleSlicerChanged.bind(this);
        this.handleRendererNameChanged = this.handleRendererNameChanged.bind(this);
        this.handleTagChange = this.handleTagChange.bind(this);
        this.cbSelectionCreated = this.cbSelectionCreated.bind(this);
    }

    componentDidMount() {
        if ( this.props.aggregation) {
            this.aggregation = this.props.aggregation;

            if ( this.aggregation.slicer?.data?.length) {
                this.setState({tags : this.aggregation.slicer.data});
            }

            this.executeAggregation();
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            debugger

            if ( this.props.aggregation) {
                this.aggregation = this.props.aggregation;

                if ( this.aggregation.slicer?.data?.length) {
                    this.setState({tags : this.aggregation.slicer.data});
                }
    
                this.executeAggregation();
            }

            if ( this.props.filter) {
                this.executeAggregation(); 
            }
        }
        
    }

    getQuery(groups, pivot) {
        let result = {
            "dataset" : this.props.ds.dataset,
            "table" : this.props.ds.table,  
            group : [],
            aggregation : [] 
        }

        if (this.props.filter) {
            result.filter = this.props.filter;
        }

        result.group = groups.map(item => {
            return {field : item}
        })

        result.aggregation = pivot.vals.map(item => {
            return {
                field : item,
                formula : pivot.aggregatorName
            }
        })

        return result;
    }

    executeAggregation() {
        let query = {
            "dataset" : this.props.ds.dataset,
            "table" : this.props.ds.table,   
            group : [],
            aggregation : [] 
        }

        if (this.props.filter) {
            query.filter = this.props.filter;
        }

        if (this.aggregation.slicer?.value) {
            if ( !query.filter) {
                query.filter = {};
            }

            query.filter[this.aggregation.slicer.name] = this.aggregation.slicer.value;
        }

        let self = this;
        let rows = (this.aggregation.abscissa || []).map(({value}) => {
            let result = {field : value};
            if ( self.aggregation.ranges && self.aggregation.ranges[value]) {
                result.range = self.aggregation.ranges[value];
            }

            return result;
        })

        let cols = (this.aggregation.ordinate || []).map(({value}) => {
            let result = {field : value};
            if ( self.aggregation.ranges && self.aggregation.ranges[value]) {
                result.range = self.aggregation.ranges[value];
            }

            return result;
        })

        query.group = [].concat(rows).concat(cols);

        query.aggregation = [
            {
                field : this.aggregation.aggregatorField,
                formula : this.aggregation.aggregatorName,
                gridFormula : this.aggregation.aggregatorGridName
            }
        ]

        this.setState({
            query : query, 
            rows : (this.aggregation.abscissa || []).map(({value}) => value), 
            cols : (this.aggregation.ordinate || []).map(({value}) => value)
        })
    }

    handleRendererNameChanged(value) {
        this.setState({
            rendererName : value
        })
    }

    handleSlicerChanged(value) {
        let query = {
            "dataset" : this.props.ds.dataset,
            "table" : this.props.ds.table,  
            group : [{"field" : value}],
            aggregation : [{
                formula:  "count",
                field: "reservation_price"
            }] 
        }

        this.aggregation.slicer = {name:value};

        const self = this;
        axios
            .post(`${process.env.REACT_APP_BASE_URL}/aggregate`, query)
            .then((response) => {
                let tags = response.data.results.map(item => item.group[0]);
                self.aggregation.slicer.data = tags;

                tags.sort();
                self.setState({tags:tags});
                self.executeAggregation();
            })
    }

    handleTagChange(e) {
        console.log(e.target.value);

        this.aggregation.slicer.value = e.target.value;
        this.executeAggregation();
    }

    renderTags() {
        const tags = this.state.tags  || [];
        if ( !tags.length) {
            return ;
        }

        const value = this.aggregation.slicer?.value || tags[0];
       
        return (
            <Radio.Group onChange={this.handleTagChange} value={value}>
                {tags.map(tag => {
                    return (
                        <Radio.Button value={tag}>{tag}</Radio.Button>
                    )
                })}
            </Radio.Group>
        )
    }

    handleAggregatorChanged(value, option) {
        this.aggregation.aggregatorName = value;
        this.aggregation.aggregatorGridName = option.label;
        this.aggregation.aggregatorField = null;

        this.executeAggregation();
    }

    handleAggregatorFieldChanged(value) {
        this.aggregation.aggregatorField = value;

        this.executeAggregation();
    }

    handleAbscissaChanged(value, groups) {
        const schema = this.props.schema;
        let self = this;
        let details = [];
        groups.forEach(group => {
            let col_schema = schema.filter(column => column.name===group.value)[0];    
            if ( col_schema && !col_schema.system ) {
                const type = col_schema.type.toUpperCase();
                if (type === 'INT64' || type === 'NUMERIC') {
                    details.push(group)
                }
            }
        })

        if ( details.length ) {
            details.forEach(fn => {
                if ( !self.aggregation.ranges ) {
                    self.aggregation.ranges = {};
                }
                self.aggregation.ranges[fn.value] = [];
            })
        }

        this.aggregation.abscissa = groups;
        this.setState({details:details});
        this.executeAggregation();
    }

    handleOrdinateChanged(value, groups) {
        const schema = this.props.schema;
        let self = this;
        let details = [];
        groups.forEach(group => {
            let col_schema = schema.filter(column => column.name===group.value)[0];    
            if ( col_schema && !col_schema.system ) {
                const type = col_schema.type.toUpperCase();
                if (type === 'INT64' || type === 'NUMERIC') {
                    details.push(group)
                }
            }
        })

        if ( details.length ) {
            details.forEach(fn => {
                if ( !self.aggregation.ranges ) {
                    self.aggregation.ranges = {};
                }
                self.aggregation.ranges[fn.value] = [];
            })
        }

        this.aggregation.ordinate = groups;
        this.setState({details:details});
        this.executeAggregation();
    }

    handleDetailsChanged(ranges, field_name) {
        this.aggregation.ranges[field_name] = ranges;
        this.executeAggregation();
    }

    renderDetails () {
        if ( !this.state.details?.length) {
            return (
                <div>
                    Select groups ...
                </div>
            )
        }

        let i=0;
        return (
            <div>
                {this.state.details.map(({ value, label }) => (
                    <div>
                        <div>{label}</div>
                        <Select
                            key={`panel${i++}`}
                            mode="tags"
                            style={{ width: '100%' }}
                            placeholder="Select groups"
                            onChange={(ranges) => { this.handleDetailsChanged(ranges, value)}}
                            filterSort={(optionA, optionB) =>
                                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                            }
                        />
                    </div>
            ))}                
            </div>
        )
    }

    isQueryReady() {
        const length = (this.aggregation.abscissa?.length || 0) + (this.aggregation.ordinate?.length || 0)
        if ( length < 1 ) {
            console.log('rows or cols or both are not yet defined');
            return false;
        }

        if ( this.aggregation.ranges ) {
            for ( let fn in this.aggregation.ranges) {
                if ( !this.aggregation.ranges[fn].length)     {
                    console.log('missing required details')
                    return false;
                }
            }
        }

        if ( !this.aggregation.aggregatorName ) {
            console.log('formula is not supplied')
            return false;
        }

        if ( !this.aggregation.aggregatorField ) {
            console.log('aggregator is not prepared yet')
            return false;
        }
        return true;
    }

    cbSelectionCreated (filter) {
        this.props.cbSelectionCreated(filter, this.aggregation);
    }

    renderControl (isQueryReady) {
        if ( !isQueryReady ) {
            return
        }
            
        if ( this.state.rendererName === 'Map') {
            const field = this.aggregation.abscissa.map(({value}) =>value)[0];
            let col_schema = this.props.schema.filter(column => column.name===field)[0];    
            if ( col_schema && col_schema.subtype) {
                if ( col_schema.subtype === 'city') {
                    return (<PivotCities
                        query={this.state.query} 
                        schema={this.props.schema}
                        state={this.aggregation.abscissa.map(({value}) =>value)[0]}
                        value={this.aggregation.aggregatorField}
                        aggregation={this.aggregation}
                        cbSelectionCreated={this.cbSelectionCreated}
                        />);
                }
                else if ( col_schema.subtype === 'us_state') {
                    return (<PivotMap
                        query={this.state.query} 
                        schema={this.props.schema}
                        nomenclature={col_schema.prop}
                        state={this.aggregation.abscissa.map(({value}) =>value)[0]}
                        value={this.aggregation.aggregatorField}
                        aggregation={this.aggregation}
                        cbSelectionCreated={this.cbSelectionCreated}
                        />);
                }
                else if ( col_schema.subtype === 'fk') {
                    //
                    console.log("GET ADDRESS SCHEMA");
                }
            }
        }
        else if ( this.state.rendererName === 'Quarters report') {
            return (<PivotBar
                query={this.state.query} 
                schema={this.props.schema}
                state={this.aggregation.abscissa.map(({value}) =>value)[0]}
                value={this.aggregation.aggregatorField}
                aggregation={this.aggregation}
                cbSelectionCreated={this.cbSelectionCreated}
                 />);
        }
        else {
            return (<PivotWrap 
                    query={this.state.query} 
                    rows={this.state.rows}
                    cols={this.state.cols}
                    rendererName={this.state.rendererName}
                    schema={this.props.schema}
                    cbSelectionCreated={this.cbSelectionCreated}
                    />) 
        }
    }

    render(){
        const isQueryReady = this.isQueryReady();
        return (
            <Layout>
                <Sider width="300">
                    <Collapse defaultActiveKey={['panel0']} onChange={(() => {})}>
                        <Panel header="Group X" key="panel0">
                            <Select
                                mode="multiple"
                                allowClear
                                style={{ width: '100%' }}
                                placeholder="Select abscissa grouping"
                                onChange={this.handleAbscissaChanged}
                                // filterSort={(optionA, optionB) =>
                                //     (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                // }
                                value={(this.aggregation.abscissa || []).map(({value}) => value)}
                                options={this.state.options}
                            />
                        </Panel>
                        <Panel header="Group Y" key="panel1">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                placeholder="Select ordinate grouping" 
                                onChange={this.handleOrdinateChanged}
                                filterSort={(optionA, optionB) =>
                                    (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                }
                                value={this.state.cols || []}
                                options={this.state.options}
                            />
                        </Panel>
                        <Panel header="Slicer" key="panel_slicer">
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Select ordinate grouping" 
                                onChange={this.handleSlicerChanged}
                                options={this.state.slicers}
                                value={this.aggregation.slicer?.name}
                            />
                            {this.renderTags()}
                        </Panel>
                        <Panel header="Details" key="panel2">
                                {this.renderDetails()}
                        </Panel>
                        <Panel header="Aggregate" key="panel3">
                            <Select
                                //defaultValue="count"
                                style={{ width: '100%' }}
                                onChange={this.handleAggregatorChanged}
                                options={[
                                    {
                                        value: 'count',
                                        label: 'Count',
                                    },
                                    {
                                        value: 'sum',
                                        label: 'Sum',
                                    },
                                    {
                                        value: 'avg',
                                        label: 'Average',
                                    },
                                    {
                                        value: 'min',
                                        label: 'Minimum',
                                    },
                                    {
                                        value: 'max',
                                        label: 'Maximum',
                                    }
                                ]}
                                value={this.aggregation.aggregatorName}
                            />
                            <Select
                                showSearch
                                style={{ width: '100%' }}
                                placeholder="Search to Select"
                                value={this.state.selectedAggregatorField || this.aggregation.aggregatorField || ""}
                                optionFilterProp="children"
                                filterOption={(input, option) => (option?.label ?? '').includes(input)}
                                filterSort={(optionA, optionB) =>
                                    (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                }
                                options={this.state.options}
                                onChange={this.handleAggregatorFieldChanged}
                             />                            
                        </Panel>
                        <Panel header="Table Details" key="panel4">
                            <Select
                                    defaultValue="Table"
                                    style={{ width: '100%' }}
                                    onChange={this.handleRendererNameChanged}
                                    options={[
                                        {
                                            value: 'Table',
                                            label: 'Table',
                                        },
                                        {
                                            value: 'Table Heatmap',
                                            label: 'Table Heatmap',
                                        },
                                        {
                                            value: 'Table Row Heatmap',
                                            label: 'Table Row Heatmap',
                                        },
                                        {
                                            value: 'Table Col Heatmap',
                                            label: 'Table Col Heatmap',
                                        },
                                        {
                                            value: 'Exportable TSV',
                                            label: 'Exportable TSV',
                                        },
                                        {
                                            value: 'Map',
                                            label: 'Map',
                                        },
                                        {
                                            value: 'Quarters report',
                                            label: 'Quarters report',
                                        }
                                    ]}
                                />
                        </Panel>
                    </Collapse>
                </Sider>
                <Layout>
                    <Content>
                       {this.renderControl(isQueryReady)}
                    </Content>
                </Layout>
            </Layout>            
        );
    }
}

import React from 'react';
import axios from "axios";
import PivotTableUI from 'react-pivottable/PivotTableUI';
import TableRenderers from "react-pivottable/TableRenderers";
//import Plot from 'react-plotly.js';
//import createPlotlyRenderers from "react-pivottable/PlotlyRenderers";

export default class PivotWrap extends React.Component {
    constructor(props) {
        super(props);

        let aggregator;
        if (this.props.query?.aggregation && this.props.query?.aggregation[0]?.gridFormula) {
            aggregator = this.props.query.aggregation[0].gridFormula;
            if ( aggregator === 'Count') {
                aggregator = 'Integer Sum';
            }
        }

        this.state = {
            data : this.props.data || [],
            aggregator : aggregator
        };
    }

    getData() {
        console.log(process.env.REACT_APP_BASE_URL); 
        let self = this;
        axios
            .post(`${process.env.REACT_APP_BASE_URL}/aggregate`, this.props.query)
            .then((response) => {
                let headers = self.props.query.group?.map(({field}) => field);
                headers = headers.concat(self.props.query.aggregation?.map(({field}) => field));
                //results.push(headers);

                let rows = [];
                response.data.results.forEach(item => {
                    let values = item.group.concat(item.value);

                    let row = {};
                    headers.forEach((header, idx) => {
                        let col_schema = self.props.schema.filter(column => column.name===header)[0];    
                        if ( col_schema && col_schema.subtype) {
                            switch (col_schema.subtype) {
                                case "quarter" :
                                    row[header] = `Q${values[idx]}`; break;
                                case "half" :
                                    row[header] = `H${values[idx]}`; break;           
                                case "day" : {
                                    var dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                    row[header] = dayOfWeek[values[idx]-1];            
                                    break;
                                }
                                default : 
                                    row[header] = values[idx];
                            }
                        }
                        else {
                            row[header] = values[idx];
                        }

                    });
                    rows.push(row)
                })

                this.setState({data : rows})
            });
    }

    componentDidMount() {
        this.getData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            this.getData();
        }
        
    }

    handlePivotChanged(pivotState) {
        console.log(pivotState);

        // rows, cols, vals, aggregatorName
        //this.state.pivot = {...pivotState};

        // const groups = (pivotState.rows || []).concat(pivotState.cols || []);

        // if (groups.length && (pivotState.vals || []).length) {
        //     const query = this.getQuery(groups, pivotState);
        //     this.getData(query)
        // }
    }

    get_db_value(col_name, value) {
        let col_schema = this.props.schema.filter(column => column.name===col_name)[0];    
        if ( col_schema && col_schema.subtype) {
            switch (col_schema.subtype) {
                case "quarter" :
                    value = parseInt(value[1]); break;
                case "half" :
                    value = parseInt(value[1]); break;
                case "day" : {
                    var dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const index = dayOfWeek.indexOf(value);
                    value = index + 1;
                    break;
                }
            }
        }

        return value;
    }

    render(){
        let self = this;
        return (

            <PivotTableUI
                data={this.state.data || []}
                //rows = {[]}
                rows = {this.props.rows}
                cols = {this.props.cols}
                aggregatorName={this.state.aggregator}
                //aggregators= {Object.assign({}, Aggregators)}
                vals={[this.props.query?.aggregation && this.props.query?.aggregation[0]?.field]}
                rendererName={this.props.rendererName}
                handlePivotClick={this.props.handlePivotClick}
                //renderers={Object.assign({}, TableRenderers, PlotlyRenderers)}
                renderers={Object.assign({}, TableRenderers)}
                onChange={s => {
                    self.handlePivotChanged(s);
                    this.setState(s);
                }}
                {...this.state}
                tableOptions={{
                    clickCallback : function(e, value, filters, pivotData){
                        let filter = {};
                        pivotData.forEachMatchingRecord(filters,
                            function(record) { 
                                console.log(record);
                                Array.from(self.props.rows || []).forEach(r => {
                                    filter[r] = self.get_db_value(r, record[r]);
                                })
                                Array.from(self.props.cols || []).forEach(c => {
                                    filter[c] = self.get_db_value(c, record[c]);
                                })
                            }
                        );

                        //let fields = Array.from(self.props.rows).concat(Array.from(self.props.cols).concat(Array.from(self.props.vals)));
                        console.log(filter);
                        //self.props.handlePivotClick(filter, fields);
                        self.props.cbSelectionCreated(filter);
                    },
                }}
                // plotlyConfig={{
                //     onClick: ({ event, points }) => {
                //         // if (points && points.length > 0) {
                //         //     const x = config.rows[0]
                //         //     const point = points[0]
                //         //     const filter = { [x]: point.label }
                //         //     clickCallback && clickCallback(event, {}, filter, myData)
                //         // }
                //     }
                // }}                
            />
        );
    }
}


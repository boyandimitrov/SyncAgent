import React from 'react';
import axios from "axios";
import {select, json, geoPath, geoAlbersUsa, scaleQuantize, schemePurples, min, max} from 'd3';
import * as topojson from "topojson-client";
import us from "../usState.json";
import cities from 'cities.json';

const app_class = 'main-application';
class PivotMap extends React.Component {
    
    constructor(props) {
        super(props);
        this.myRef = React.createRef(); 
        this.state = {
            data : this.props.data || [],
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

                //debugger
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

                let states_values = rows.reduce((accumulator, current) => {
                    accumulator[current[self.props.state]] = current[self.props.value];
                    return accumulator;
                }, {})

                if ( ! select(`.${app_class}`).node() ) {
                    select(this.myRef.current)
                        .append('div')
                        //.text('Hello from D3')
                        .attr('class', app_class);
        
                        this.renderSVG( states_values);
                    }
            });
    }
   
    componentDidMount() {
        console.log(this.myRef.current);

        this.getData();
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            this.getData();
        }
    }

    renderSVG(data) {

        const self = this;
        const width = 960;
        const height = 560;
        
        const states = JSON.parse(JSON.stringify(us));

        json("https://unpkg.com/us-atlas@3.0.0/states-10m.json")
             .then (usa => {
                //const states = topojson.feature(usa, usa.objects.states).features;
                debugger
                const projection = geoAlbersUsa().fitSize([width, height], states);
                const path = geoPath().projection(projection);
                
                const svg = select(`.${app_class}`).append("svg").attr("viewBox", [0, 0, 975, 610]);
                const colorScale = scaleQuantize([min(Object.values(data)), max(Object.values(data))], schemePurples[9])

                let value = null;
                svg
                    .selectAll(".state")
                    .data(states.features)
                    .join("path")
                    .attr("d", path)
                    .on("click", (event, d) => {
                        const node = svg.node();
                        node.value = value = value === d.properties.NAME ? null : d.properties.NAME;
                        node.dispatchEvent(new Event("input", {bubbles: true}));
                        outline.attr("d", value ? path(d) : null);
                        self.props.cbSelectionCreated({[self.props.state] : d.properties[self.props.nomenclature]})
                    })            
                    .attr("class", "state")
                    .style("fill", function(d) {
                        const value = data[d.properties[self.props.nomenclature]];
                        if (value) {
                            return colorScale(value);
                        } else {
                            return "#ccc";
                        }
                    })
                    .attr("fill-opacity", 1);
                    //.attr("stroke", "black");

            const labels = svg.append("g").attr("id", "labels") // setup a container <g> node to hold all the labels
            labels.selectAll("text")
                .data(states.features)                       // we're still working with the same geographic data
                .join('text')                                     // we want to add a <text> SVG node for each state
                .attr('text-anchor', 'middle')                  // style it up a little bit to look reasonable and readable
                .attr('fill', 'grey')
                .text(d => d.properties[self.props.nomenclature])
                .attr('x', d => path.centroid(d)[0])
                .attr('y', d => path.centroid(d)[1])

            svg.append("path")
                .datum(topojson.mesh(usa, usa.objects.states, (a, b) => a !== b))
                .attr("fill", "none")
                .attr("stroke", "white")
                .attr("stroke-linejoin", "round")
                .attr("pointer-events", "none")
                .attr("d", path);            


            const outline = svg.append("path")
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-linejoin", "round")
                .attr("pointer-events", "none");         
        })   
    }

    render(){
        return (
            <div ref={this.myRef}>
            </div>
        );
    }
}

export default PivotMap;
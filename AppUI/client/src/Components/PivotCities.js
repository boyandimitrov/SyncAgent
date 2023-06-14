import React from 'react';
import axios from "axios";
import {select, json, geoPath, geoAlbersUsa, scaleQuantize, schemePurples, min, max} from 'd3';
import * as topojson from "topojson-client";
import us from "../usState.json";
import cities from 'cities.json';

const app_class = 'main-application';

class PivotCities extends React.Component {

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

                let cities_values = rows.reduce((accumulator, current) => {
                    accumulator[current[self.props.state]] = current[self.props.value];
                    return accumulator;
                }, {})

                if ( ! select(`.${app_class}`).node() ) {
                    select(this.myRef.current)
                        .append('div')
                        //.text('Hello from D3')
                        .attr('class', app_class);
        
                        this.renderSVG( cities_values);
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

    renderCircles(svg, projection, cities, colorScale) {
        // let t = tip()
        //     .attr('class', 'd3-tip')
        //     .offset([-10, 0])
        //     .html(function(d) {
        //         return d.name;
        //     });
        let self = this;

        let circleGroup = svg.selectAll('circle')
            .data(cities)
            .enter()
        .append('g')
        .attr('transform', function(d) {
          return 'translate('+ projection([d.lng, d.lat])+')';
            })
        .attr('class', 'city')
        .on("click", (event, d) => {
            self.props.cbSelectionCreated({[self.props.state] : d.name})
        }); 
    
      circleGroup
        .append('circle')
        .style('fill', d => colorScale(d.aggr))
        .style("stroke", "grey")
        .style('fill-opacity', .8)
            .attr('r', function (d) {
              return d.aggr ? d.aggr * 0.02 : 0;
            })
        // .on('mouseover', t.show)
        // .on('mouseout', t.hide)
        .append('title')
        .text(function(d) {
            return d.name;
        //   return d.name+ ' -'+
        //   '\nMurders: '+d.murder+' ('+Math.round(d.murder_rate)+' for every 100k),'+
        //   '\n2015 Population: '+ d.pop_2015;
        });
    }

    renderSVG(data) {

        const self = this;
        const width = 960;
        const height = 560;
        
        const states = JSON.parse(JSON.stringify(us));

        json("https://unpkg.com/us-atlas@3.0.0/states-10m.json")
             .then (usa => {
                //const states = topojson.feature(usa, usa.objects.states).features;
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
                    .attr("class", "state")
                    .style("fill", function(d) {
                        return "#ccc";
                        const value = data[d.properties.STUSPS];
                        if (value) {
                            //return colorScale(value);
                        } else {
                            return "#ccc";
                        }
                    })
                    .attr("fill-opacity", 1);
                    //.attr("stroke", "black");

                let new_cities = [];
                let us_cities = cities.filter(({country}) => country === "US");
                us_cities.forEach(city => {
                    if ( data[city.name] ) {
                        let new_city = Object.assign({}, city);
                        new_city.aggr = data[city.name];
                        new_cities.push(new_city);
                    }
                })

                this.renderCircles(svg, projection, new_cities, colorScale)
return;                    
            const labels = svg.append("g").attr("id", "labels") // setup a container <g> node to hold all the labels
            labels.selectAll("text")
                .data(states.features)                       // we're still working with the same geographic data
                .join('text')                                     // we want to add a <text> SVG node for each state
                .attr('text-anchor', 'middle')                  // style it up a little bit to look reasonable and readable
                .attr('fill', 'grey')
                .text(d => d.properties.STUSPS)
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

export default PivotCities;
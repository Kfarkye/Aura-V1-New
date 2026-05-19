/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  BarChart, Bar, 
  AreaChart, Area, 
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { ChartData } from '../types';
import { motion } from 'motion/react';
import * as d3 from 'd3';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from '@codesandbox/sandpack-react';

export const AuraTask: React.FC<{ taskTitle: string, onAdd?: () => void }> = ({ taskTitle, onAdd }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="my-6 rounded-[28px] p-6 flex items-center justify-between bg-white/60 backdrop-blur-[24px] backdrop-saturate-[180%] border border-black/[0.03] shadow-[0_12px_48px_-12px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,1)] relative overflow-hidden group transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] hover:bg-white/80 font-sans"
    >
      <div className="flex items-center gap-5 min-w-0 z-10">
        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-b from-black/[0.02] to-black/[0.05] border border-black/[0.05] flex items-center justify-center shrink-0 shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-black/70" />
        </div>
        <div className="min-w-0 pr-4 flex-1">
          <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-[0.25em] mb-1.5 opacity-80">Essential Action</p>
          <p className="text-[17px] font-medium text-[#1d1d1f] tracking-[-0.01em] truncate leading-tight">{taskTitle}</p>
        </div>
      </div>
      {onAdd && (
        <button 
          onClick={onAdd}
          className="z-10 flex items-center gap-1.5 px-6 py-3 bg-[#1d1d1f] text-white rounded-full text-[13px] font-medium tracking-[0.02em] hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_8px_24px_rgba(0,0,0,0.15)] focus:outline-none shrink-0 ml-2"
          aria-label={`Add task to queue: ${taskTitle}`}
        >
          Engage
        </button>
      )}
    </motion.div>
  );
};

const TypewriterGrid: React.FC<{ data: any[], keys: string[] }> = ({ data, keys }) => {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortAsc, setSortAsc] = React.useState(true);

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      if (a[sortKey] < b[sortKey]) return sortAsc ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortAsc]);

  const stats = React.useMemo(() => {
    const s: Record<string, { mean: number, std: number }> = {};
    if (!data || data.length === 0) return s;
    const allKeys = Object.keys(data[0] || {});
    allKeys.forEach(k => {
      const vals = data.map(d => d[k]).filter(v => typeof v === 'number');
      if (vals.length > 0) {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const sqDiff = vals.map(v => Math.pow(v - mean, 2));
        const std = Math.sqrt(sqDiff.reduce((a, b) => a + b, 0) / vals.length);
        s[k] = { mean, std };
      }
    });
    return s;
  }, [data]);

  return (
    <div className="w-full h-full overflow-auto bg-white/50 rounded-[16px] font-sans text-[13px] border border-black/[0.04] relative shadow-inner">
      <table className="w-full text-left border-collapse whitespace-nowrap">
        <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-black/[0.04]">
          <tr>
            {Object.keys(data[0] || {}).map((k) => (
              <th 
                key={k} 
                className="p-4 cursor-pointer hover:bg-black/[0.02] text-[#86868b] font-medium text-[11px] uppercase tracking-[0.1em] select-none transition-colors"
                onClick={() => {
                  if (sortKey === k) setSortAsc(!sortAsc);
                  else { setSortKey(k); setSortAsc(true); }
                }}
              >
                <div className="flex items-center gap-2">
                  {k} 
                  {sortKey === k && (
                    <span className="text-[#1d1d1f] text-xs">{sortAsc ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.03]">
          {sortedData.map((row, i) => (
            <tr key={i} className="hover:bg-black/[0.02] transition-colors group">
              {Object.entries(row).map(([k, v]) => {
                let isOutlier = false;
                if (typeof v === 'number' && stats[k] && stats[k].std > 0) {
                  const zScore = Math.abs((v - stats[k].mean) / stats[k].std);
                  if (zScore > 1.5) isOutlier = true;
                }
                return (
                  <td key={k} className={`p-4 transition-colors ${isOutlier ? 'text-[#ff3b30] font-medium bg-[#ff3b30]/5' : 'text-[#1d1d1f]'}`}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{typeof v === 'number' ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v)}</span>
                      {isOutlier && <span className="text-[10px] font-medium bg-[#ff3b30]/10 text-[#ff3b30] px-2 py-0.5 rounded-full tracking-wide">Outlier</span>}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const COLORS = ['#1d1d1f', '#0066cc', '#34c759', '#ff9500', '#ff3b30'];

const PREMIUM_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
body {
  font-family: "SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #fafafa;
  color: #1d1d1f;
  margin: 0;
  padding: 40px;
  line-height: 1.65;
  letter-spacing: -0.01em;
}
h1, h2, h3, h4, h5, h6 {
  font-weight: 500;
  color: #1d1d1f;
  margin-top: 32px;
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}
h1 { font-size: 36px; font-weight: 600; }
h2 { font-size: 28px; font-weight: 500; }
h3 { font-size: 22px; font-weight: 500; }
p { margin-bottom: 24px; color: #86868b; font-weight: 400; font-size: 15px; }
strong { color: #1d1d1f; font-weight: 500; }

/* Essentialist Form Elements */
input:not([type="checkbox"]):not([type="radio"]), select, textarea {
  font-family: inherit;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 16px 20px;
  font-size: 15px;
  color: #1d1d1f;
  transition: all 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 24px;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 4px rgba(0,0,0,0.05);
}

/* Essentialist Buttons */
button {
  background: #1d1d1f;
  color: #ffffff;
  border: none;
  border-radius: 9999px; /* full pill */
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
button:hover {
  background: #000000;
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}
button:active {
  transform: translateY(1px) scale(0.98);
}

/* Essentialist Tables */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 4px 16px rgba(0,0,0,0.02);
}
th, td {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  text-align: left;
}
th {
  background: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  color: #86868b;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
tr:last-child td {
  border-bottom: none;
}
tr:hover td {
  background: rgba(0, 0, 0, 0.02);
}

/* Typography & Labels */
label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #86868b;
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}

/* Cards */
.card, .workflow-card, .artifact-container {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  border-radius: 24px;
  padding: 36px;
  border: 1px solid rgba(0, 0, 0, 0.03);
  box-shadow: 0 16px 48px -12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1);
  margin-bottom: 32px;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.card:hover, .workflow-card:hover {
  box-shadow: 0 24px 64px -16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,1);
  transform: translateY(-2px);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.3);
}

::selection {
  background: rgba(0,102,204,0.15);
  color: #1d1d1f;
}
`;

const D3NetworkGraph: React.FC<{ data: any }> = ({ data }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!svgRef.current || !data || !data.nodes) return;

    const width = 600;
    const height = 300;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const nodes = data.nodes.map((d: any) => ({ ...d }));
    const links = data.links.map((d: any) => ({ ...d }));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id))
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt((d as any).value || 1));

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", (d, i) => COLORS[i % COLORS.length])
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("title").text(d => (d as any).id);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d as any).source.x)
        .attr("y1", d => (d as any).source.y)
        .attr("x2", d => (d as any).target.x)
        .attr("y2", d => (d as any).target.y);

      node
        .attr("cx", d => (d as any).x)
        .attr("cy", d => (d as any).y);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => { simulation.stop(); };
  }, [data]);

  return <svg ref={svgRef} width="100%" height="300" viewBox="0 0 600 300" className="overflow-visible" />;
};

const Heatmap: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="grid grid-cols-10 gap-1 h-full max-h-[300px] overflow-y-auto pr-2">
      {data.map((val, i) => (
        <div 
          key={i} 
          className="rounded-sm transition-all hover:scale-110 cursor-pointer h-8"
          style={{ 
            backgroundColor: `rgba(79, 70, 229, ${Math.min(1, (val.value || 0) / 100)})`,
          }}
          title={`Value: ${val.value}`}
        />
      ))}
    </div>
  );
};

export const AuraChart: React.FC<{ data: ChartData }> = ({ data }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const zoomBehavior = React.useRef<d3.ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const [viewMode, setViewMode] = React.useState<'data' | 'visual'>('data');

  React.useEffect(() => {
    if (!containerRef.current) return;
    
    zoomBehavior.current = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        if (innerRef.current) {
          innerRef.current.style.transform = `translate(${event.transform.x}px, ${event.transform.y}px) scale(${event.transform.k})`;
          innerRef.current.style.transformOrigin = '0 0';
        }
      });
      
    d3.select(containerRef.current).call(zoomBehavior.current);
    
    // Set initial cursor
    d3.select(containerRef.current).style('cursor', 'grab');
    
    // Change cursor on drag
    d3.select(containerRef.current)
      .on('mousedown', () => d3.select(containerRef.current!).style('cursor', 'grabbing'))
      .on('mouseup', () => d3.select(containerRef.current!).style('cursor', 'grab'))
      .on('mouseleave', () => d3.select(containerRef.current!).style('cursor', 'grab'));
      
  }, []);

  const handleZoomIn = () => {
    if (containerRef.current && zoomBehavior.current) {
      d3.select(containerRef.current).transition().call(zoomBehavior.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current && zoomBehavior.current) {
      d3.select(containerRef.current).transition().call(zoomBehavior.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (containerRef.current && zoomBehavior.current) {
      d3.select(containerRef.current).transition().call(zoomBehavior.current.transform, d3.zoomIdentity);
    }
  };

  const renderChart = () => {
    switch (data.type) {
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={data.xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
            />
            <Legend />
            {data.keys.map((key, i) => (
              <Scatter key={key} name={key} data={data.data} fill={COLORS[i % COLORS.length]} />
            ))}
          </ScatterChart>
        );
      case 'heatmap':
        return <Heatmap data={data.data} />;
      case 'network':
        return <D3NetworkGraph data={data.data} />;
      case 'bar':
        return (
          <BarChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={data.xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
              itemStyle={{ color: '#1e293b' }}
            />
            <Legend />
            {data.keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart data={data.data}>
            <defs>
              {data.keys.map((key, i) => (
                <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={data.xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
            />
            {data.keys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fillOpacity={1} fill={`url(#grad-${key})`} />
            ))}
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data.data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey={data.keys[0]}
            >
              {data.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
      default:
        return (
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={data.xAxisKey} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b' }}
            />
            <Legend />
            {data.keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="p-8 rounded-[36px] bg-white/60 backdrop-blur-[24px] backdrop-saturate-[180%] border border-black/[0.03] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,1)] w-full min-h-[400px] h-[60vh] my-6 overflow-hidden flex flex-col relative group font-sans transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_32px_80px_-16px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,1)]"
    >
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-black/[0.04]">
        {data.title && <h3 className="text-[18px] font-medium text-[#1d1d1f] tracking-tight z-10 m-0">{data.title}</h3>}
        
        <div className="flex items-center gap-1 bg-black/[0.03] rounded-full border border-black/[0.02] p-1 z-10 shadow-inner">
          <button
            onClick={() => setViewMode('data')}
            className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
              viewMode === 'data' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
              viewMode === 'visual' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Visual
          </button>
        </div>

        {viewMode === 'visual' && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-md rounded-full border border-black/[0.04] p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] z-10 text-[#86868b]">
          <button onClick={handleZoomIn} className="px-2.5 hover:bg-black/[0.04] hover:text-[#1d1d1f] rounded-full text-lg leading-none" title="Zoom In">
            +
          </button>
          <button onClick={handleZoomOut} className="px-2.5 hover:bg-black/[0.04] hover:text-[#1d1d1f] rounded-full text-lg leading-none" title="Zoom Out">
            &minus;
          </button>
          <div className="w-px h-4 bg-black/[0.08] mx-1" />
          <button onClick={handleResetZoom} className="px-3 py-1 flex items-center justify-center hover:bg-black/[0.04] hover:text-[#1d1d1f] rounded-full text-[12px] font-medium uppercase tracking-wider" title="Reset Zoom">
            Reset
          </button>
        </div>
        )}
      </div>
      
      <div className="flex-1 w-full relative overflow-hidden rounded-[8px] z-0">
        {viewMode === 'data' ? (
          <TypewriterGrid data={data.data} keys={data.keys} />
        ) : (
          <div ref={containerRef} className="absolute inset-0 w-full h-full">
            <div ref={innerRef} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const AuraApp: React.FC<{ code: string }> = ({ code }) => {
  const [editableCode, setEditableCode] = React.useState(code);
  const [mode, setMode] = React.useState<'preview' | 'code'>('preview');

  const isHtml = React.useMemo(() => {
    const trimmed = editableCode.trim();
    return (
      trimmed.startsWith('<!') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML') ||
      (trimmed.includes('<head') && trimmed.includes('<body')) ||
      (trimmed.includes('<script') && !trimmed.includes('export default')) ||
      (trimmed.includes('class="') && !trimmed.includes('className=')) ||
      trimmed.includes('<!--')
    );
  }, [editableCode]);

  const htmlPreviewDoc = React.useMemo(() => {
    if (!isHtml) return '';
    const injections = `<script src="https://cdn.tailwindcss.com"></script><style>${PREMIUM_CSS}</style>`;
    
    let doc = editableCode;
    if (doc.toLowerCase().includes('<head>')) {
      return doc.replace(/<head>/i, `<head>${injections}`);
    } else if (doc.toLowerCase().includes('<html>')) {
      return doc.replace(/<html>/i, `<html><head>${injections}</head>`);
    } else {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            ${injections}
          </head>
          <body>
            ${doc}
          </body>
        </html>
      `;
    }
  }, [editableCode, isHtml]);

  // Transform code for Sandpack (React mode only)
  const sandpackCode = React.useMemo(() => {
    if (isHtml) return editableCode;

    let processed = editableCode;

    // Strip markdown code fences that the AI model may emit (e.g., ```jsx ... ```)
    processed = processed.replace(/^```(?:jsx|tsx|javascript|typescript|js|ts|react)?\s*\n?/i, '');
    processed = processed.replace(/\n?```\s*$/i, '');
    processed = processed.trim();

    // Ensure React is imported
    if (!processed.includes("import React")) {
      processed = `import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';\n` + processed;
    }
    
    // Ensure styles are imported
    if (!processed.includes("import './styles.css'")) {
      processed = `import './styles.css';\n` + processed;
    }

    // If code already has export default, it's ready for Sandpack
    if (processed.includes('export default')) {
      return processed;
    }

    // If it looks like a function component without export default, add it
    const funcMatch = processed.match(/^(function\s+(\w+)\s*\()/m);
    if (funcMatch) {
      processed = processed.replace(funcMatch[1], `export default function ${funcMatch[2]}(`);
      return processed;
    }

    // If it's a const component like `const App = () => {`
    const constMatch = processed.match(/^const\s+(\w+)\s*=\s*/m);
    if (constMatch) {
      processed += `\nexport default ${constMatch[1]};`;
      return processed;
    }

    // Fallback: wrap raw JSX in a component
    if (!processed.includes('export default') && !processed.includes('ReactDOM')) {
      processed = `export default function App() {\n  return (\n    ${processed}\n  );\n}`;
    }

    return processed;
  }, [editableCode, isHtml]);

  if (isHtml) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white/60 backdrop-blur-[24px] backdrop-saturate-[180%] rounded-[32px] overflow-hidden my-8 border border-black/[0.03] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col font-sans transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_48px_100px_-20px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,1)]"
      >
        <div className="bg-white/40 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-black/[0.04]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 shadow-inner" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 shadow-inner" />
          </div>
          
          <div className="flex items-center gap-1 bg-black/[0.03] rounded-full border border-black/[0.02] p-1 shadow-inner">
            <button
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
                mode === 'preview' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Runtime
            </button>
            <button
              onClick={() => setMode('code')}
              className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
                mode === 'code' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Source
            </button>
          </div>
          <div className="w-16" />
        </div>

        <div className="w-full relative flex-1 min-h-[600px] h-[75vh]">
          {mode === 'preview' ? (
            <iframe
              srcDoc={htmlPreviewDoc}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <pre className="w-full h-full overflow-auto p-8 bg-[#fafafa] text-[#1d1d1f] text-[13px] font-mono leading-relaxed m-0 shadow-inner">
              {editableCode}
            </pre>
          )}
        </div>
      </motion.div>
    );
  }

  // React mode: use Sandpack
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white/60 backdrop-blur-[24px] backdrop-saturate-[180%] rounded-[32px] overflow-hidden my-8 border border-black/[0.03] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] flex flex-col font-sans transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_48px_100px_-20px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,1)]"
    >
      {/* Essentialist Header */}
      <div className="bg-white/40 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-black/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 shadow-inner" />
        </div>
        
        <div className="flex items-center gap-1 bg-black/[0.03] rounded-full border border-black/[0.02] p-1 shadow-inner">
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
              mode === 'preview' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Runtime
          </button>
          <button
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
              mode === 'code' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Source
          </button>
        </div>
        <div className="w-16" /> {/* spacer for alignment */}
      </div>

      {/* Sandpack Engine */}
      <div className="w-full relative flex-1 min-h-[600px] h-[75vh]">
        <SandpackProvider
          template="react-ts"
          files={{
            '/App.tsx': { code: sandpackCode, active: true },
            '/styles.css': { code: PREMIUM_CSS, hidden: true }
          }}
          customSetup={{
            dependencies: {
              'recharts': 'latest',
              'framer-motion': 'latest',
              'lucide-react': 'latest',
              'd3': 'latest',
              'firebase': 'latest',
            },
          }}
          options={{
            externalResources: ['https://cdn.tailwindcss.com'],
          }}
          theme={{
            colors: {
              surface1: mode === 'code' ? '#fafafa' : '#ffffff',
              surface2: '#f0f0f0',
              surface3: '#e5e5e5',
              clickable: '#86868b',
              base: '#1d1d1f',
              disabled: '#c4c4c4',
              hover: '#000000',
              accent: '#000000',
              errorSurface: '#fff0f0',
              error: '#ff3b30',
            },
            font: {
              body: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
              mono: '"SF Mono", "JetBrains Mono", ui-monospace, monospace',
              size: '14px',
              lineHeight: '1.7',
            },
          }}
        >
          <SandpackLayout
            style={{
              border: 'none',
              borderRadius: 0,
              height: '100%',
            }}
          >
            {mode === 'preview' ? (
              <SandpackPreview
                showNavigator={false}
                showRefreshButton={false}
                style={{ height: '100%', border: 'none' }}
              />
            ) : (
              <SandpackCodeEditor
                showLineNumbers
                showInlineErrors
                wrapContent
                style={{ height: '100%', border: 'none' }}
              />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </motion.div>
  );
};


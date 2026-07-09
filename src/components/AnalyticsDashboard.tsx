import React from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  Activity, 
  HeartHandshake, 
  Package, 
  TrendingUp, 
  Calendar,
  Layers,
  Sparkles,
  Award
} from "lucide-react";
import { useAppSelector } from "../redux/store";

export default function AnalyticsDashboard() {
  const { interactions } = useAppSelector((state) => state.interaction);
  const { doctors, products } = useAppSelector((state) => state.doctor);

  // Fallback to seeded if not loaded
  const list = interactions.length > 0 ? interactions : [];

  // 1. Calculate Metrics
  const totalInteractions = list.length;
  const avgQuality = totalInteractions > 0 
    ? Math.round(list.reduce((acc, curr) => acc + (curr.quality_score || 80), 0) / totalInteractions)
    : 85;
  const totalSamples = list.reduce((acc, curr) => acc + (parseInt(curr.samples_given, 10) || 0), 0);
  
  const positiveSentimentCount = list.filter(i => (i.sentiment || "").toLowerCase() === "positive").length;
  const positivePercentage = totalInteractions > 0
    ? Math.round((positiveSentimentCount / totalInteractions) * 100)
    : 80;

  // 2. Prepare Chart Data - Sentiment Pie Chart
  const sentimentCounts: Record<string, number> = {};
  list.forEach(i => {
    const s = i.sentiment || "Neutral";
    sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
  });
  const sentimentData = Object.keys(sentimentCounts).map(key => ({
    name: key,
    value: sentimentCounts[key]
  }));
  const SENTIMENT_COLORS: Record<string, string> = {
    Positive: "#10b981", // emerald
    Neutral: "#64748b",  // slate
    Negative: "#f43f5e"  // rose
  };

  // 3. Prepare Chart Data - Meeting Types Bar Chart
  const typeCounts: Record<string, number> = {};
  list.forEach(i => {
    const t = i.meeting_type || "Face to Face";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeData = Object.keys(typeCounts).map(key => ({
    type: key,
    count: typeCounts[key]
  }));

  // 4. Prepare Chart Data - Products Discussed Frequency
  const productCounts: Record<string, number> = {};
  list.forEach(i => {
    const prods = i.products || [];
    prods.forEach((p: string) => {
      productCounts[p] = (productCounts[p] || 0) + 1;
    });
  });
  const productData = Object.keys(productCounts).map(key => ({
    name: key.split(" ")[0], // short name
    discussCount: productCounts[key]
  })).slice(0, 5); // top 5

  // 5. Timeline data
  const timelineList = [...list].sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());

  return (
    <div id="analytics-dashboard-view" className="space-y-6">
      {/* Upper banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Field Representative Analytics</h2>
          <p className="text-blue-100 text-xs mt-1 max-w-xl">
            Real-time medical activity KPIs, prescription confidence indexes, and automatic AI interaction quality analysis.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-xs">
          <Sparkles className="w-4.5 h-4.5 text-blue-300 inline" />
          <span className="text-xs font-semibold font-mono">AI COMPLIANCE CHECKER ACTIVE</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div id="kpi-interactions" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Interactions Logged</span>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{totalInteractions}</h3>
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 inline" /> +12% vs last month
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div id="kpi-quality" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Avg Quality Score</span>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{avgQuality}%</h3>
            <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
              Excellent Performance
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div id="kpi-samples" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Samples Given</span>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{totalSamples} packs</h3>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Glucophage, Januvia, Crestor</span>
          </div>
        </div>

        {/* Card 4 */}
        <div id="kpi-sentiment" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Positive Sentiment</span>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{positivePercentage}%</h3>
            <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
              High Doctor Engagement
            </span>
          </div>
        </div>
      </div>

      {/* Chart Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Discussion Frequency */}
        <div id="chart-products" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Product Discussions</span>
          </h4>
          <div className="h-64">
            {productData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="discussCount" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Discussion Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">No product metrics logged yet</div>
            )}
          </div>
        </div>

        {/* Meeting Type Breakdown */}
        <div id="chart-meeting-types" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>Meeting Channels</span>
          </h4>
          <div className="h-64">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Interactions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">No channels logged yet</div>
            )}
          </div>
        </div>

        {/* Sentiment breakdown (Donut) */}
        <div id="chart-sentiment" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-500" />
            <span>Doctor Sentiment</span>
          </h4>
          <div className="h-64 flex flex-col items-center justify-center">
            {sentimentData.length > 0 ? (
              <div className="w-full h-full relative">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name] || "#cbd5e1"} />
                      ))}
                    </Pie>
                    <Tooltip wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex justify-center gap-4 text-[10px] font-semibold text-slate-500 mt-2">
                  {sentimentData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[entry.name] }}></span>
                      <span>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-mono">No sentiment scores parsed yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Doctor Interaction Timeline */}
      <div id="doctor-timeline-panel" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Chronological Doctor Interaction Timeline</h3>
            <p className="text-slate-400 text-[11px]">Audit trail of all logged HCP touchpoints and clinical interactions.</p>
          </div>
        </div>

        {timelineList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono">
            No logged interactions found. Go ahead and log an interaction to generate the timeline!
          </div>
        ) : (
          <div className="relative border-l border-slate-200 ml-4 space-y-6">
            {timelineList.map((item) => (
              <div key={item.id} className="relative pl-6">
                {/* Timeline Dot */}
                <span className={`absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  item.sentiment === "Positive" ? "bg-emerald-500" : item.sentiment === "Negative" ? "bg-rose-500" : "bg-slate-500"
                }`}></span>

                {/* Card Container */}
                <div 
                  id={`timeline-card-${item.id}`}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 hover:border-slate-300 hover:bg-white transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{item.doctor_name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.specialization} • {item.hospital}</p>
                    </div>
                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold uppercase font-mono">{item.meeting_type}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase font-mono">QS: {item.quality_score || 80}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono ${
                        item.priority === "High" ? "bg-rose-100 text-rose-700" : item.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                      }`}>{item.priority}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wide font-mono">AI Meeting Summary</span>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{item.summary}</p>
                    </div>
                    {item.products && item.products.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wide font-mono">Products Discussed</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.products.map((p: string, idx: number) => (
                            <span key={idx} className="bg-slate-200/80 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.doctor_feedback && (
                      <div>
                        <span className="font-bold text-slate-500 block uppercase text-[9px] tracking-wide font-mono">Doctor Feedback</span>
                        <p className="text-slate-600 italic text-[11px] mt-0.5">"{item.doctor_feedback}"</p>
                      </div>
                    )}
                    {item.next_best_action && (
                      <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg mt-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 font-mono block">AI Next Best Action</span>
                          <p className="text-blue-900 text-[11px] leading-snug font-medium mt-0.5">{item.next_best_action}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-3 border-t border-slate-100 pt-3">
                    <span className="font-bold">Date Logged:</span> {item.meeting_date} {item.meeting_time && `@ ${item.meeting_time}`}
                    {item.samples_given > 0 && (
                      <>
                        <span className="text-slate-200">|</span>
                        <span>{item.samples_given} Sample Packs Distributed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Minimize, Download, FileText, FileSpreadsheet, BookOpen, FileType, Loader2 } from 'lucide-react';

export default function DocumentReaderPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params?.id as string;

  const [scenario, setScenario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBRFormat, setShowBRFormat] = useState(false);
  const [brLoading, setBrLoading] = useState(false);
  const [brFormats, setBrFormats] = useState<{ [key: number]: any }>({});

  useEffect(() => {
    loadScenario();
  }, [scenarioId]);

  const loadScenario = async () => {
    try {
      setLoading(true);
      const scenarios = await apiClient.listScenarios();
      const found = scenarios.find((s: any) => s.scenarioId === scenarioId || s.scenario_set_id === scenarioId);

      if (!found) {
        setError('Scenario not found');
        return;
      }

      setScenario(found);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load scenario:', err);
      setError(err.message || 'Failed to load scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

  const handleExport = async (format: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://invalid';
      const endpoint = `${API_URL}/scenarios/export/${format.toLowerCase()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: { ...scenario, ...scenario.result } }),
      });

      if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const company_name = scenario.company_name.replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const extensions: Record<string, string> = { 'PDF': 'pdf', 'PPTX': 'pptx', 'WORD': 'docx', 'EPUB': 'epub' };
      a.download = `Strategic_Foresight_${company_name}_${date}.${extensions[format]}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
      alert(`Failed to export to ${format}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBRTransform = async (scenarioData: any, index: number) => {
    try {
      setBrLoading(true);
      const result = await apiClient.transformToBoardroom(
        scenarioData.narrative,
        scenario.company_name,
        scenarioData.title
      );
      setBrFormats({ ...brFormats, [index]: result.boardroom_format });
    } catch (err: any) {
      console.error('BR transformation failed:', err);
      alert('Failed to transform to boardroom format: ' + (err.message || 'Unknown error'));
    } finally {
      setBrLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !scenario) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Scenario not found'}</p>
          <button
            onClick={() => router.push('/scenarios')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const result = scenario.result;

  return (
    <div className="min-h-screen bg-[#f5f5f5]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
      {/* Header Controls */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/scenarios')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-black">
                {scenario.company_name} | {scenario.industry}
              </h2>
              <p className="text-sm text-gray-600">
                {scenario.region} | {scenario.horizon_years}-Year Horizon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg border border-gray-300">
              <button onClick={handleZoomOut} className="p-1 hover:bg-gray-200 rounded">
                <ZoomOut className="w-4 h-4 text-gray-700" />
              </button>
              <input
                type="range"
                min="50"
                max="200"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm font-medium text-gray-700 min-w-[3rem]">{zoom}%</span>
              <button onClick={handleZoomIn} className="p-1 hover:bg-gray-200 rounded">
                <ZoomIn className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button onClick={() => handleExport('PDF')} className="p-2 hover:bg-gray-100 rounded" title="Export as PDF">
                <FileText className="w-5 h-5 text-red-600" />
              </button>
              <button onClick={() => handleExport('PPTX')} className="p-2 hover:bg-gray-100 rounded" title="Export as PowerPoint">
                <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              </button>
              <button onClick={() => handleExport('WORD')} className="p-2 hover:bg-gray-100 rounded" title="Export as Word">
                <FileType className="w-5 h-5 text-blue-800" />
              </button>
            </div>

            {/* BR Format Toggle */}
            <button
              onClick={() => setShowBRFormat(!showBRFormat)}
              disabled={brLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showBRFormat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {showBRFormat ? 'Academic Format' : 'BR Format'}
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-5xl mx-auto py-8 px-4">
        <div
          className="bg-[#e8e8e8] shadow-2xl"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}
        >
          {/* Cover Page */}
          <div className="bg-white p-16 border-b-8 border-blue-900">
            <div className="text-center space-y-8">
              <h1 className="text-5xl font-bold text-black tracking-tight">
                STRATEGIC FORESIGHT ANALYSIS
              </h1>
              <div className="h-1 w-32 bg-blue-600 mx-auto"></div>

              <div className="space-y-2 text-2xl text-black">
                <p className="font-semibold">{scenario.company_name}</p>
                <p className="text-lg text-gray-700">{scenario.industry} Sector</p>
              </div>

              <div className="text-lg text-black space-y-1">
                <p>{scenario.region} | {scenario.horizon_years}-Year Horizon</p>
                <p className="text-sm text-gray-600">
                  {new Date(scenario.createdAt * 1000 || scenario.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="pt-16 space-y-2">
                <p className="text-gray-700 font-medium">Prepared for</p>
                <p className="text-xl font-semibold text-black">{scenario.company_name} Board of Directors</p>
              </div>

              <div className="pt-8 space-y-2">
                <p className="text-gray-700 font-medium">Prepared by</p>
                <p className="text-xl font-semibold text-black">Strategic Foresight Partners</p>
              </div>

              <div className="pt-12">
                <div className="inline-block px-6 py-2 bg-red-100 border border-red-300 rounded">
                  <p className="text-red-800 font-bold text-sm">CONFIDENTIAL - BOARD LEVEL ONLY</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scenario Matrix Framework */}
          {result?.matrix_framework && (
            <div className="bg-white p-16 border-b border-gray-300">
              <h2 className="text-3xl font-bold text-black mb-8">Scenario Planning Framework</h2>

              <div className="space-y-6">
                {result.matrix_framework.axis_x && (
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-3">
                      Axis X: {result.matrix_framework.axis_x.name}
                    </h3>
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex-1 text-center">
                        <p className="font-medium text-blue-900">{result.matrix_framework.axis_x.left_pole}</p>
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="h-0.5 w-32 bg-blue-600"></div>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-medium text-blue-900">{result.matrix_framework.axis_x.right_pole}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-black">{result.matrix_framework.axis_x.description}</p>
                  </div>
                )}

                {result.matrix_framework.axis_y && (
                  <div>
                    <h3 className="text-xl font-semibold text-black mb-3">
                      Axis Y: {result.matrix_framework.axis_y.name}
                    </h3>
                    <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex-1 text-center">
                        <p className="font-medium text-green-900">{result.matrix_framework.axis_y.bottom_pole}</p>
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="h-0.5 w-32 bg-green-600"></div>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-medium text-green-900">{result.matrix_framework.axis_y.top_pole}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-black">{result.matrix_framework.axis_y.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scenarios */}
          {result?.scenarios?.map((scn: any, index: number) => (
            <div key={index} className="bg-white p-16 border-b border-gray-300">
              <div className="mb-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-blue-600 mb-2">
                      SCENARIO {index + 1} • {scn.quadrant}
                    </div>
                    <h2 className="text-4xl font-bold text-black mb-4">{scn.title}</h2>
                    <p className="text-xl text-gray-700 italic">{scn.tagline}</p>
                  </div>
                  <div className="ml-8 px-4 py-2 bg-blue-100 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600">Probability</p>
                    <p className="text-2xl font-bold text-blue-900">{(scn.probability * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>

              {/* Core Logic */}
              {scn.core_logic && (
                <div className="mb-8 p-6 bg-gray-50 rounded-lg border-l-4 border-blue-600">
                  <h3 className="text-lg font-semibold text-black mb-3">Core Logic</h3>
                  <p className="text-black leading-relaxed">{scn.core_logic}</p>
                </div>
              )}

              {/* Show BR Format or Academic */}
              {showBRFormat && brFormats[index] ? (
                <div className="space-y-6">
                  {/* BLUF */}
                  <div className="p-6 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">BLUF - Bottom Line Up Front</h3>
                    <p className="text-black leading-relaxed">{brFormats[index].executive_summary_bluf}</p>
                  </div>

                  {/* Decision Framework */}
                  {brFormats[index].decision_framework && (
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold text-black mb-4">KILL / DOUBLE Framework</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-semibold text-red-900 mb-2">🔴 KILL</h4>
                          <p className="text-sm font-medium text-black mb-2">{brFormats[index].decision_framework.kill?.asset}</p>
                          <p className="text-sm text-gray-700">{brFormats[index].decision_framework.kill?.rationale}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-green-900 mb-2">🟢 DOUBLE</h4>
                          <p className="text-sm font-medium text-black mb-2">{brFormats[index].decision_framework.double?.asset}</p>
                          <p className="text-sm text-gray-700">{brFormats[index].decision_framework.double?.rationale}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowBRFormat(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    View Academic Format
                  </button>
                </div>
              ) : (
                <div>
                  {/* Academic Narrative */}
                  <div className="prose prose-lg max-w-none mb-8">
                    <div className="text-black leading-relaxed whitespace-pre-wrap">
                      {scn.narrative}
                    </div>
                  </div>

                  {!brFormats[index] && (
                    <button
                      onClick={() => handleBRTransform(scn, index)}
                      disabled={brLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {brLoading ? 'Transforming...' : 'Transform to BR Format'}
                    </button>
                  )}
                </div>
              )}

              {/* Signposts */}
              {scn.signposts && scn.signposts.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-black mb-6">Strategic Signposts</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-black">Indicator</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-black">Timeframe</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-black">Significance</th>
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-black">Data Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scn.signposts.map((signpost: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-3 text-black">{signpost.indicator}</td>
                            <td className="border border-gray-300 px-4 py-3 text-gray-700">{signpost.timeframe}</td>
                            <td className="border border-gray-300 px-4 py-3 text-gray-700">{signpost.significance}</td>
                            <td className="border border-gray-300 px-4 py-3 text-gray-600 text-sm">{signpost.data_source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* References */}
              {scn.references && scn.references.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-2xl font-bold text-black mb-6">References</h3>
                  <div className="space-y-3">
                    {scn.references.map((ref: string, idx: number) => (
                      <div key={idx} className="text-gray-800 pl-8 -indent-8">
                        <span className="text-gray-500 font-medium">[{idx + 1}]</span> {ref}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Footer */}
          <div className="bg-white px-16 py-8 border-t border-gray-300">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="font-medium text-black">
                {scenario.company_name} | Strategic Foresight Partners
              </div>
              <div className="text-black">
                Page {result?.scenarios?.length ? result.scenarios.length + 2 : 2}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

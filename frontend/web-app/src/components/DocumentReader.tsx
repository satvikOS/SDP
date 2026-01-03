'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, Minimize, Download, FileText, FileSpreadsheet, BookOpen, FileType } from 'lucide-react';

interface DocumentReaderProps {
  scenario: any;
  onClose: () => void;
}

export default function DocumentReader({ scenario, onClose }: DocumentReaderProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBRFormat, setShowBRFormat] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(parseInt(e.target.value));
  };

  // Export handlers
  const handleExport = async (format: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = `${API_URL}/scenarios/export/${format.toLowerCase()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Set filename based on format
      const company_name = scenario.company_name.replace(/\s+/g, '_');
      const date = new Date().toISOString().split('T')[0];
      const extensions: Record<string, string> = {
        'PDF': 'pdf',
        'PPTX': 'pptx',
        'WORD': 'docx',
        'EPUB': 'epub'
      };
      a.download = `Strategic_Foresight_${company_name}_${date}.${extensions[format]}`;

      // Trigger download
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
      alert(`Failed to export to ${format}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 ${isFullscreen ? 'bg-white' : 'bg-black/50 backdrop-blur-sm'}`}
    >
      <div className={`${isFullscreen ? 'h-full' : 'container mx-auto h-full'} flex flex-col`}>
        {/* Header Controls */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Professional Document Viewer</h2>
            <span className="text-sm text-gray-500">
              {scenario.company_name} | {scenario.industry}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-gray-700" />
              </button>
              <input
                type="range"
                min="50"
                max="200"
                value={zoom}
                onChange={handleZoomChange}
                className="w-24"
              />
              <span className="text-sm font-medium text-gray-700 min-w-[3rem]">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('PDF')}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Export as PDF"
              >
                <FileText className="w-5 h-5 text-red-600" />
              </button>
              <button
                onClick={() => handleExport('PPTX')}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Export as PowerPoint"
              >
                <FileSpreadsheet className="w-5 h-5 text-orange-600" />
              </button>
              <button
                onClick={() => handleExport('EPUB')}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Export as EPUB"
              >
                <BookOpen className="w-5 h-5 text-blue-600" />
              </button>
              <button
                onClick={() => handleExport('WORD')}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Export as Word"
              >
                <FileType className="w-5 h-5 text-blue-800" />
              </button>
            </div>

            {/* BR Format Toggle */}
            <button
              onClick={() => setShowBRFormat(!showBRFormat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showBRFormat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showBRFormat ? 'Show Academic' : 'Show BR Format'}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-gray-700" />
              ) : (
                <Maximize className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Close Button */}
            {!isFullscreen && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div
            className="max-w-5xl mx-auto bg-white shadow-lg my-8"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Cover Page */}
            <div className="p-16 border-b-8 border-blue-900">
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
                    STRATEGIC FORESIGHT ANALYSIS
                  </h1>
                  <div className="h-1 w-32 bg-blue-600 mx-auto"></div>
                </div>

                <div className="space-y-2 text-2xl text-gray-700">
                  <p className="font-semibold">{scenario.company_name}</p>
                  <p className="text-lg text-gray-500">{scenario.industry} Sector</p>
                </div>

                <div className="text-lg text-gray-600 space-y-1">
                  <p>{scenario.region} | {scenario.horizon_years}-Year Horizon</p>
                  <p className="text-sm text-gray-500">
                    {new Date(scenario.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="pt-16 space-y-2">
                  <p className="text-gray-700 font-medium">Prepared for</p>
                  <p className="text-xl font-semibold text-gray-900">{scenario.company_name} Board of Directors</p>
                </div>

                <div className="pt-8 space-y-2">
                  <p className="text-gray-700 font-medium">Prepared by</p>
                  <p className="text-xl font-semibold text-gray-900">Strategic Foresight Partners</p>
                </div>

                <div className="pt-12">
                  <div className="inline-block px-6 py-2 bg-red-100 border border-red-300 rounded">
                    <p className="text-red-800 font-bold text-sm">CONFIDENTIAL - BOARD LEVEL ONLY</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Matrix Framework */}
            {scenario.matrix_framework && (
              <div className="p-16 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Scenario Planning Framework</h2>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">
                      Axis X: {scenario.matrix_framework.axis_x?.name}
                    </h3>
                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                      <div className="flex-1 text-center">
                        <p className="font-medium text-blue-900">{scenario.matrix_framework.axis_x?.left_pole}</p>
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="h-0.5 w-32 bg-blue-600"></div>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-medium text-blue-900">{scenario.matrix_framework.axis_x?.right_pole}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-gray-600">{scenario.matrix_framework.axis_x?.description}</p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">
                      Axis Y: {scenario.matrix_framework.axis_y?.name}
                    </h3>
                    <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
                      <div className="flex-1 text-center">
                        <p className="font-medium text-green-900">{scenario.matrix_framework.axis_y?.bottom_pole}</p>
                      </div>
                      <div className="flex-1 flex justify-center">
                        <div className="h-0.5 w-32 bg-green-600"></div>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-medium text-green-900">{scenario.matrix_framework.axis_y?.top_pole}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-gray-600">{scenario.matrix_framework.axis_y?.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Scenarios */}
            {scenario.scenarios?.map((scn: any, index: number) => (
              <div key={index} className="p-16 border-b border-gray-200">
                <div className="mb-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-blue-600 mb-2">
                        SCENARIO {index + 1} • {scn.quadrant}
                      </div>
                      <h2 className="text-4xl font-bold text-gray-900 mb-4">{scn.title}</h2>
                      <p className="text-xl text-gray-600 italic">{scn.tagline}</p>
                    </div>
                    <div className="ml-8 px-4 py-2 bg-blue-100 rounded-lg">
                      <p className="text-sm text-gray-600">Probability</p>
                      <p className="text-2xl font-bold text-blue-900">{(scn.probability * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                {/* Core Logic */}
                {scn.core_logic && (
                  <div className="mb-8 p-6 bg-gray-50 rounded-lg border-l-4 border-blue-600">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Logic</h3>
                    <p className="text-gray-700 leading-relaxed">{scn.core_logic}</p>
                  </div>
                )}

                {/* Narrative */}
                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {scn.narrative}
                  </div>
                </div>

                {/* Signposts - Only show if signposts exist with valid data */}
                {scn.signposts && scn.signposts.length > 0 && scn.signposts.some((sp: any) => sp.indicator && sp.indicator.trim()) && (
                  <div className="mt-12">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Strategic Signposts</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Indicator</th>
                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Timeframe</th>
                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Significance</th>
                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Data Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scn.signposts.filter((sp: any) => sp.indicator && sp.indicator.trim()).map((signpost: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-3 text-gray-800">{signpost.indicator}</td>
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
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">References</h3>
                    <div className="space-y-3">
                      {scn.references.map((ref: string, idx: number) => (
                        <div key={idx} className="text-gray-700 pl-8 -indent-8">
                          <span className="text-gray-500 font-medium">[{idx + 1}]</span> {ref}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Footer - Company Branding */}
            <div className="px-16 py-8 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="font-medium">
                  {scenario.company_name} | Strategic Foresight Partners
                </div>
                <div>
                  Page {scenario.scenarios?.length ? scenario.scenarios.length + 2 : 2}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

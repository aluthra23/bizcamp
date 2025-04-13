'use client';


import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Node,
    Edge,
    Position,
    useNodesState,
    useEdgesState,
    MarkerType,
    addEdge,
    ConnectionLineType,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';


// Define types
interface ConceptNode {
    id: string;
    text: string;
    type: 'concept' | 'topic' | 'action';
    importance: number; // 1-10
    start_time?: number;
    end_time?: number;
    text_snippet?: string;
}


interface ConceptEdge {
    source: string;
    target: string;
    type: 'related' | 'subTopic' | 'implies';
    strength: number; // 1-10
}


interface ConceptGraph {
    nodes: ConceptNode[];
    edges: ConceptEdge[];
}


interface MeetingDetails {
    _id: string;
    teamId: string;
    title: string;
    description: string;
    meeting_date: string;
}


// Define custom node component for concept nodes
const ConceptNodeComponent = ({ data }: { data: any }) => {
    const nodeStyle = useMemo(() => {
        switch (data.nodeType) {
            case 'concept':
                return { background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)' };
            case 'topic':
                return { background: 'linear-gradient(to bottom right, #7e22ce, #9333ea)' };
            case 'action':
                return { background: 'linear-gradient(to bottom right, #10b981, #059669)' };
            default:
                return { background: 'linear-gradient(to bottom right, #6b7280, #4b5563)' };
        }
    }, [data.nodeType]);


    return (
        <div
            className="relative px-2 py-1.5 rounded-lg border border-white/30 max-w-[130px] shadow-md"
            style={nodeStyle}
        >
            {/* Source handles on all sides with unique IDs */}
            <Handle type="source" position={Position.Top} id="source-top" style={{ background: '#555', width: 7, height: 7 }} />
            <Handle type="source" position={Position.Right} id="source-right" style={{ background: '#555', width: 7, height: 7 }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ background: '#555', width: 7, height: 7 }} />
            <Handle type="source" position={Position.Left} id="source-left" style={{ background: '#555', width: 7, height: 7 }} />

            {/* Target handles with unique IDs */}
            <Handle type="target" position={Position.Top} id="target-top" style={{ background: '#555', width: 7, height: 7 }} />
            <Handle type="target" position={Position.Right} id="target-right" style={{ background: '#555', width: 7, height: 7 }} />
            <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ background: '#555', width: 7, height: 7 }} />
            <Handle type="target" position={Position.Left} id="target-left" style={{ background: '#555', width: 7, height: 7 }} />

            <p className="font-semibold text-white text-center text-xs truncate">{data.label}</p>
            <div className="flex justify-center mt-0.5">
                <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-white/90 text-xs">
                    {data.importance}/10
                </span>
            </div>
        </div>
    );
};


export default function ConceptGraphPage() {
    const router = useRouter();
    const params = useParams();
    const departmentId = params.department_id as string;
    const teamId = params.team_id as string;
    const meetingId = params.meeting_id as string;


    // State for meeting data
    const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    // State for concept graph data
    const [conceptGraph, setConceptGraph] = useState<ConceptGraph | null>(null);
    const [isLoadingGraph, setIsLoadingGraph] = useState(false);
    const [graphError, setGraphError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);


    // React Flow states
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);


    useEffect(() => {
        const fetchMeeting = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/backend/meetings/${meetingId}`);


                if (!response.ok) {
                    throw new Error('Failed to fetch meeting');
                }


                const meetingData = await response.json();
                setMeeting(meetingData);


                // Fetch concept graph data
                await fetchConceptGraph(meetingId);


            } catch (err) {
                console.error('Error fetching meeting:', err);
                setError('Failed to load meeting');
            } finally {
                setIsLoading(false);
            }
        };


        fetchMeeting();
    }, [meetingId]);


    // Fetch concept graph from API
    const fetchConceptGraph = async (meetingId: string) => {
        setIsLoadingGraph(true);
        setGraphError(null);
        try {
            const response = await fetch(`/api/backend/meetings/${meetingId}/conceptgraph`);


            if (!response.ok) {
                throw new Error('Failed to fetch concept graph');
            }


            const data = await response.json();
            console.log('Raw concept graph data:', data.conceptgraph);


            if (data.conceptgraph && data.conceptgraph.nodes && data.conceptgraph.edges) {
                console.log(`Received ${data.conceptgraph.nodes.length} nodes and ${data.conceptgraph.edges.length} edges`);
                setConceptGraph(data.conceptgraph);
                processGraphForReactFlow(data.conceptgraph);
            } else {
                console.error('Invalid concept graph structure:', data.conceptgraph);
                setGraphError('Received invalid concept graph structure from server');
                setConceptGraph(null);
            }


        } catch (err) {
            console.error('Error fetching concept graph:', err);
            setGraphError('Failed to load concept graph data');
        } finally {
            setIsLoadingGraph(false);
        }
    };


    // Process the graph data for React Flow
    const processGraphForReactFlow = (graph: ConceptGraph) => {
        if (!graph || !graph.nodes || !graph.edges) return;


        console.log("Processing graph with:", graph.nodes.length, "nodes and", graph.edges.length, "edges");


        // First create a simplified array of nodes with basic positioning
        // Use a very simple circular layout with fixed positions
        const simpleNodes = graph.nodes.map((node, index) => {
            const angle = (index / graph.nodes.length) * 2 * Math.PI;
            const radius = 200;


            return {
                id: node.id,
                position: {
                    x: 300 + radius * Math.cos(angle),
                    y: 300 + radius * Math.sin(angle)
                },
                data: {
                    label: node.text,
                    nodeType: node.type,
                    importance: node.importance
                },
                type: 'conceptNode'
            };
        });


        // Create very simple edges with minimal styling
        const simpleEdges = graph.edges.map((edge, index) => {
            // Assign handles based on the relationship between nodes
            // For simplicity, we'll use a deterministic approach:
            // - Find the positions of the source and target nodes
            const sourceNode = simpleNodes.find(n => n.id === edge.source);
            const targetNode = simpleNodes.find(n => n.id === edge.target);

            // Determine best handles based on node positions
            let sourceHandle = "source-right";
            let targetHandle = "target-left";

            if (sourceNode && targetNode) {
                // If target is above source, use top/bottom handles
                if (targetNode.position.y < sourceNode.position.y) {
                    sourceHandle = "source-top";
                    targetHandle = "target-bottom";
                }
                // If target is below source, use bottom/top handles
                else if (targetNode.position.y > sourceNode.position.y) {
                    sourceHandle = "source-bottom";
                    targetHandle = "target-top";
                }
                // Otherwise use left/right which was set as default
            }

            return {
                id: `e${index}`,
                source: edge.source,
                target: edge.target,
                sourceHandle: sourceHandle,
                targetHandle: targetHandle,
                type: 'default', // Explicitly set to default type
                animated: false,
                style: {
                    stroke: '#6366f1', // Changed from red to indigo
                    strokeWidth: 3     // Thicker line
                }
            };
        });


        // Print details of the first few edges for debugging
        const nodesToConsole = simpleNodes.slice(0, 3).map(n => ({ id: n.id, position: n.position }));
        const edgesToConsole = simpleEdges.slice(0, 3);
        console.log("Sample nodes:", JSON.stringify(nodesToConsole));
        console.log("Sample edges:", JSON.stringify(edgesToConsole));


        // Immediately set the nodes and edges without any delay
        setNodes(simpleNodes);
        setEdges(simpleEdges);
    };


    // Helper function to get related nodes to the selected node
    const getRelatedNodes = (nodeId: string): ConceptNode[] => {
        if (!conceptGraph) return [];


        const relatedEdges = conceptGraph.edges.filter(
            edge => edge.source === nodeId || edge.target === nodeId
        );


        const relatedNodeIds = new Set(
            relatedEdges.map(edge =>
                edge.source === nodeId ? edge.target : edge.source
            )
        );


        return conceptGraph.nodes.filter(node => relatedNodeIds.has(node.id));
    };


    // Helper function to get relationships between selected node and another node
    const getRelationship = (nodeId1: string, nodeId2: string): ConceptEdge | null => {
        if (!conceptGraph) return null;


        return conceptGraph.edges.find(
            edge => (edge.source === nodeId1 && edge.target === nodeId2) ||
                (edge.source === nodeId2 && edge.target === nodeId1)
        ) || null;
    };


    // Helper function to get node color based on type
    const getNodeColor = (type: string): string => {
        switch (type) {
            case 'concept':
                return 'from-blue-500 to-indigo-500';
            case 'topic':
                return 'from-purple-600 to-pink-500';
            case 'action':
                return 'from-green-500 to-emerald-500';
            default:
                return 'from-gray-500 to-gray-700';
        }
    };


    // Function to handle node click in the graph
    const onNodeClick = useCallback((event: any, node: Node) => {
        setSelectedNode(node.id === selectedNode ? null : node.id);
    }, [selectedNode]);


    // Function to handle node drag end
    const onNodeDragStop = useCallback((event: any, node: Node) => {
        // When a node is moved, update all nodes to maintain the current layout
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === node.id) {
                    // This node was just dragged, update its position
                    n.position = node.position;
                }
                return n;
            })
        );
    }, [setNodes]);


    // Handle connection between nodes
    const onConnect = useCallback(
        (params: any) => {
            console.log("Connect params:", params); // Log to debug
            setEdges((eds) => addEdge({
                ...params,
                type: 'bezier', // Use bezier edges for new connections
                animated: false,
                // Make sure we're preserving the handle IDs
                sourceHandle: params.sourceHandle,
                targetHandle: params.targetHandle,
                style: { stroke: '#6366f1', strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#6366f1',
                }
            }, eds));
        },
        [setEdges]
    );
    console.log("nodes")
    console.log(nodes)
    console.log("edges")
    console.log(edges)


    const nodeTypes = useMemo(() => ({ conceptNode: ConceptNodeComponent }), []);


    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }


    if (error || !meeting) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Meeting not found</h2>
                    <p className="text-text-secondary mb-6">The meeting you're looking for doesn't exist or has been removed.</p>
                    <Link
                        href={`/home/${departmentId}/${teamId}`}
                        className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                    >
                        Back to Meetings
                    </Link>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto py-8 px-4">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6">
                    <Link href="/home" className="text-white/60 hover:text-white transition">
                        Departments
                    </Link>
                    <span className="text-white/40">→</span>
                    <Link href={`/home/${departmentId}`} className="text-white/60 hover:text-white transition">
                        Teams
                    </Link>
                    <span className="text-white/40">→</span>
                    <Link href={`/home/${departmentId}/${teamId}`} className="text-white/60 hover:text-white transition">
                        Meetings
                    </Link>
                    <span className="text-white/40">→</span>
                    <Link href={`/home/${departmentId}/${teamId}/${meetingId}`} className="text-white/60 hover:text-white transition">
                        {meeting.title}
                    </Link>
                    <span className="text-white/40">→</span>
                    <span className="text-white">Concept Graph</span>
                </div>


                {/* Meeting header */}
                <div className="glass-effect rounded-xl p-6 border border-white/10 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{meeting.title} - Concept Graph</h1>
                            <p className="text-text-secondary mt-1">
                                {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>


                        <Link
                            href={`/home/${departmentId}/${teamId}/${meetingId}`}
                            className="text-white hover:text-primary-light flex items-center gap-2 transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back to Meeting
                        </Link>
                    </div>
                </div>


                {/* Concept Graph Container */}
                <div className="glass-effect rounded-xl border border-white/10 p-6">
                    {isLoadingGraph ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                    ) : graphError ? (
                        <div className="text-center p-8">
                            <h2 className="text-xl font-bold text-white mb-4">Couldn't load concept graph</h2>
                            <p className="text-text-secondary mb-6">{graphError}</p>
                            <button
                                onClick={() => fetchConceptGraph(meetingId)}
                                className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : !conceptGraph || !conceptGraph.nodes || !conceptGraph.edges ||
                        conceptGraph.nodes.length === 0 || conceptGraph.edges.length === 0 ? (
                        <div className="text-center p-8">
                            <h2 className="text-xl font-bold text-white mb-4">No concept graph data available</h2>
                            <p className="text-text-secondary mb-6">
                                {!conceptGraph || (!conceptGraph.nodes && !conceptGraph.edges) ?
                                    "The concept graph for this meeting hasn't been generated yet or no transcription data is available." :
                                    conceptGraph.nodes.length === 0 ?
                                        "No concepts were identified in the transcript." :
                                        "No relationships were identified between concepts."
                                }
                            </p>
                            <Link
                                href={`/home/${departmentId}/${teamId}/${meetingId}/transcription`}
                                className="bg-gradient-to-r from-primary to-accent text-white px-4 py-2 rounded-full font-medium"
                            >
                                View Transcription
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="md:w-1/3">
                                    <h2 className="text-xl font-semibold text-white mb-4">Key Concepts</h2>
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                        {conceptGraph.nodes
                                            .sort((a, b) => b.importance - a.importance)
                                            .map((node) => (
                                                <div
                                                    key={node.id}
                                                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedNode === node.id
                                                        ? 'bg-white/10 border-primary-light'
                                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                                                        }`}
                                                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                            style={
                                                                node.type === 'concept'
                                                                    ? { background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)' }
                                                                    : node.type === 'topic'
                                                                        ? { background: 'linear-gradient(to bottom right, #7e22ce, #9333ea)' }
                                                                        : node.type === 'action'
                                                                            ? { background: 'linear-gradient(to bottom right, #10b981, #059669)' }
                                                                            : { background: 'linear-gradient(to bottom right, #6b7280, #4b5563)' }
                                                            }
                                                        >
                                                            {node.importance}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{node.text}</p>
                                                            <p className="text-xs text-white/50 capitalize">{node.type}</p>
                                                        </div>
                                                    </div>
                                                    {node.text_snippet && (
                                                        <p className="text-sm text-text-secondary mt-2 line-clamp-2">
                                                            {node.text_snippet}
                                                        </p>
                                                    )}
                                                    {/* {node.start_time !== undefined && node.end_time !== undefined && (
                                                        <p className="text-xs text-white/50 mt-2">
                                                            {Math.floor(node.start_time / 60)}:{(node.start_time % 60).toString().padStart(2, '0')} -
                                                            {Math.floor(node.end_time / 60)}:{(node.end_time % 60).toString().padStart(2, '0')}
                                                        </p>
                                                    )} */}
                                                </div>
                                            ))}
                                    </div>
                                </div>


                                <div className="md:w-2/3">
                                    <h2 className="text-xl font-semibold text-white mb-4">
                                        {selectedNode
                                            ? `Relationships for "${conceptGraph.nodes.find(n => n.id === selectedNode)?.text}"`
                                            : "Concept Network"
                                        }
                                    </h2>


                                    {/* React Flow Graph */}
                                    <div className="glass-effect rounded-xl border border-white/10 mb-6" style={{ height: '600px', overflow: 'hidden' }}>
                                        <ReactFlow
                                            nodes={nodes}
                                            edges={edges}
                                            onNodesChange={onNodesChange}
                                            onEdgesChange={onEdgesChange}
                                            onNodeClick={onNodeClick}
                                            onNodeDragStop={onNodeDragStop}
                                            onConnect={onConnect}
                                            nodeTypes={nodeTypes}
                                            fitView
                                            minZoom={0.2}
                                            maxZoom={2}
                                            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                                            panOnDrag
                                            elementsSelectable={true}
                                            panOnScroll={true}
                                            zoomOnScroll={true}
                                            snapToGrid={false}
                                            nodesDraggable={true}
                                            nodesConnectable={true}
                                            defaultEdgeOptions={{
                                                type: 'bezier',
                                                animated: false,
                                            }}
                                            connectionLineType={ConnectionLineType.Bezier}
                                            connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
                                        >
                                            <Background color="#ffffff20" gap={16} size={1} />
                                            <Controls showInteractive={false} />
                                            <MiniMap
                                                style={{
                                                    backgroundColor: "rgba(30, 30, 40, 0.8)"
                                                }}
                                                nodeColor={(node) => {
                                                    switch (node.data?.nodeType) {
                                                        case 'concept': return '#6366f1';
                                                        case 'topic': return '#7e22ce';
                                                        case 'action': return '#10b981';
                                                        default: return '#6b7280';
                                                    }
                                                }}
                                            />
                                        </ReactFlow>
                                    </div>


                                    {/* Legend */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 py-4 bg-white/5 rounded-lg border border-white/10">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)' }}></div>
                                            <span className="text-sm text-white/80">Concept</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom right, #7e22ce, #9333ea)' }}></div>
                                            <span className="text-sm text-white/80">Topic</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(to bottom right, #10b981, #059669)' }}></div>
                                            <span className="text-sm text-white/80">Action</span>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Node Details Panel - show when a node is selected */}
                            {selectedNode && (
                                <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
                                    <h3 className="text-lg font-semibold text-white mb-3">
                                        Related Concepts
                                    </h3>


                                    {getRelatedNodes(selectedNode).length > 0 ? (
                                        <div className="space-y-4">
                                            {getRelatedNodes(selectedNode).map(relatedNode => {
                                                const relationship = getRelationship(selectedNode, relatedNode.id);
                                                return (
                                                    <div key={relatedNode.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                                style={
                                                                    relatedNode.type === 'concept'
                                                                        ? { background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)' }
                                                                        : relatedNode.type === 'topic'
                                                                            ? { background: 'linear-gradient(to bottom right, #7e22ce, #9333ea)' }
                                                                            : relatedNode.type === 'action'
                                                                                ? { background: 'linear-gradient(to bottom right, #10b981, #059669)' }
                                                                                : { background: 'linear-gradient(to bottom right, #6b7280, #4b5563)' }
                                                                }
                                                            >
                                                                {relatedNode.importance}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-white">{relatedNode.text}</p>
                                                                <p className="text-xs text-white/50 capitalize">{relatedNode.type}</p>
                                                            </div>
                                                        </div>


                                                        {relationship && (
                                                            <div className="mt-2 px-3 py-1 bg-white/10 rounded-full inline-block">
                                                                <p className="text-xs text-primary-light">
                                                                    <span>Strength: {relationship.strength}/10</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-text-secondary">No directly related concepts found.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}







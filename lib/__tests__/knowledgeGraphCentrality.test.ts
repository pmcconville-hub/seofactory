import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph } from '../knowledgeGraph';
import { KnowledgeNode, KnowledgeEdge } from '../../types';

// Helper to create a node
function createNode(id: string, term?: string): KnowledgeNode {
  return {
    id,
    term: term || id,
    type: 'concept',
    definition: `Definition for ${id}`,
    metadata: {
      importance: 0.5,
      source: 'test',
    },
  };
}

// Helper to create an edge
function createEdge(source: string, target: string, id?: string): KnowledgeEdge {
  return {
    id: id || `${source}-${target}`,
    source,
    target,
    relation: 'relates_to',
    metadata: {
      source: 'test',
    },
  };
}

describe('KnowledgeGraph Betweenness Centrality', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
  });

  describe('buildAdjacencyList (via calculateBetweennessCentrality)', () => {
    it('should handle empty graph', () => {
      const centrality = graph.calculateBetweennessCentrality();
      expect(centrality.size).toBe(0);
    });

    it('should handle single node with no edges', () => {
      graph.addNode(createNode('A'));
      const centrality = graph.calculateBetweennessCentrality();
      expect(centrality.size).toBe(1);
      expect(centrality.get('A')).toBe(0);
    });
  });

  describe('calculateBetweennessCentrality', () => {
    it('should give bridge node higher centrality than endpoints in A--B--C graph', () => {
      // Linear graph: A -- B -- C
      // B is the bridge between A and C
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      const centrality = graph.calculateBetweennessCentrality();

      // B should have the highest centrality (it's on all paths between A and C)
      expect(centrality.get('B')).toBeGreaterThan(centrality.get('A')!);
      expect(centrality.get('B')).toBeGreaterThan(centrality.get('C')!);

      // A and C are endpoints, should have lower/equal centrality
      expect(centrality.get('A')).toBe(centrality.get('C'));
    });

    it('should give nodes with no connections 0 centrality', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      // No edges - all nodes are isolated

      const centrality = graph.calculateBetweennessCentrality();

      expect(centrality.get('A')).toBe(0);
      expect(centrality.get('B')).toBe(0);
      expect(centrality.get('C')).toBe(0);
    });

    it('should give star graph center highest centrality', () => {
      // Star graph: A, B, C, D all connected to CENTER
      //     A
      //     |
      // B--CENTER--C
      //     |
      //     D
      graph.addNode(createNode('CENTER'));
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('CENTER', 'A'));
      graph.addEdge(createEdge('CENTER', 'B'));
      graph.addEdge(createEdge('CENTER', 'C'));
      graph.addEdge(createEdge('CENTER', 'D'));

      const centrality = graph.calculateBetweennessCentrality();

      // CENTER should have the highest centrality
      const centerScore = centrality.get('CENTER')!;
      expect(centerScore).toBeGreaterThan(centrality.get('A')!);
      expect(centerScore).toBeGreaterThan(centrality.get('B')!);
      expect(centerScore).toBeGreaterThan(centrality.get('C')!);
      expect(centerScore).toBeGreaterThan(centrality.get('D')!);

      // All leaf nodes should have equal (zero) centrality
      expect(centrality.get('A')).toBe(centrality.get('B'));
      expect(centrality.get('B')).toBe(centrality.get('C'));
      expect(centrality.get('C')).toBe(centrality.get('D'));
    });

    it('should normalize scores to 0-1 range', () => {
      // Create a larger graph with varying centrality
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      // A--B--C--D--E (linear chain)
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));
      graph.addEdge(createEdge('C', 'D'));
      graph.addEdge(createEdge('D', 'E'));

      const centrality = graph.calculateBetweennessCentrality();

      // All scores should be between 0 and 1
      for (const score of centrality.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }

      // The maximum score should be exactly 1.0 (normalized)
      const maxScore = Math.max(...centrality.values());
      expect(maxScore).toBe(1);
    });

    it('should cache results and invalidate on graph changes', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addEdge(createEdge('A', 'B'));

      // First call computes and caches
      const centrality1 = graph.calculateBetweennessCentrality();

      // Second call should return same result (from cache)
      const centrality2 = graph.calculateBetweennessCentrality();
      expect(centrality2).toEqual(centrality1);

      // Adding a node should invalidate cache
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('B', 'C'));

      const centrality3 = graph.calculateBetweennessCentrality();
      // B should now have non-zero centrality (bridge between A and C)
      expect(centrality3.get('B')).toBeGreaterThan(0);
    });

    it('should handle cycles correctly', () => {
      // Triangle: A--B--C--A
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));
      graph.addEdge(createEdge('C', 'A'));

      const centrality = graph.calculateBetweennessCentrality();

      // In a triangle, all nodes should have equal centrality
      expect(centrality.get('A')).toBe(centrality.get('B'));
      expect(centrality.get('B')).toBe(centrality.get('C'));
    });

    it('should handle disconnected components', () => {
      // Two separate components: A--B and C--D
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('C', 'D'));

      const centrality = graph.calculateBetweennessCentrality();

      // All nodes should have 0 centrality (no node is a bridge)
      expect(centrality.get('A')).toBe(0);
      expect(centrality.get('B')).toBe(0);
      expect(centrality.get('C')).toBe(0);
      expect(centrality.get('D')).toBe(0);
    });
  });

  describe('getCentralityScore', () => {
    it('should return centrality score for a node by ID', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      const score = graph.getCentralityScore('B');
      expect(score).toBeGreaterThan(0);
    });

    it('should return centrality score for a node by term', () => {
      graph.addNode(createNode('node-1', 'Entity One'));
      graph.addNode(createNode('node-2', 'Entity Two'));
      graph.addNode(createNode('node-3', 'Entity Three'));
      graph.addEdge(createEdge('node-1', 'node-2'));
      graph.addEdge(createEdge('node-2', 'node-3'));

      const score = graph.getCentralityScore('Entity Two');
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for non-existent entity', () => {
      graph.addNode(createNode('A'));

      const score = graph.getCentralityScore('NonExistent');
      expect(score).toBe(0);
    });

    it('should return 0 for isolated node', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      // No edges

      const score = graph.getCentralityScore('A');
      expect(score).toBe(0);
    });
  });

  describe('findBridgeEntities', () => {
    it('should return nodes above threshold sorted by centrality descending', () => {
      // Linear graph: A--B--C--D--E
      // B, C, D are bridges with C having highest centrality
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addNode(createNode('D'));
      graph.addNode(createNode('E'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));
      graph.addEdge(createEdge('C', 'D'));
      graph.addEdge(createEdge('D', 'E'));

      const bridges = graph.findBridgeEntities(0.1);

      // Should have at least the central nodes
      expect(bridges.length).toBeGreaterThan(0);

      // C should be first (highest centrality - middle of chain)
      expect(bridges[0].id).toBe('C');
    });

    it('should return empty array when no nodes above threshold', () => {
      // All isolated nodes have 0 centrality
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));

      const bridges = graph.findBridgeEntities(0.3);
      expect(bridges).toHaveLength(0);
    });

    it('should use default threshold of 0.3', () => {
      // Star graph
      graph.addNode(createNode('CENTER'));
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('CENTER', 'A'));
      graph.addEdge(createEdge('CENTER', 'B'));
      graph.addEdge(createEdge('CENTER', 'C'));

      const bridges = graph.findBridgeEntities();

      // CENTER has normalized centrality of 1.0, which is >= 0.3
      expect(bridges.some(n => n.id === 'CENTER')).toBe(true);
    });

    it('should respect custom threshold', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      // With threshold 0.5, only B (normalized score 1.0) should qualify
      const bridges05 = graph.findBridgeEntities(0.5);
      expect(bridges05.some(n => n.id === 'B')).toBe(true);
      expect(bridges05.length).toBe(1);

      // With threshold 1.0, only the max centrality node qualifies
      const bridges10 = graph.findBridgeEntities(1.0);
      expect(bridges10.length).toBe(1);
      expect(bridges10[0].id).toBe('B');
    });

    it('should handle empty graph', () => {
      const bridges = graph.findBridgeEntities(0.3);
      expect(bridges).toHaveLength(0);
    });

    it('should return KnowledgeNode objects with full metadata', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      const bridges = graph.findBridgeEntities(0);

      // All bridges should be proper KnowledgeNode objects
      for (const bridge of bridges) {
        expect(bridge).toHaveProperty('id');
        expect(bridge).toHaveProperty('term');
        expect(bridge).toHaveProperty('type');
        expect(bridge).toHaveProperty('definition');
        expect(bridge).toHaveProperty('metadata');
      }
    });
  });

  describe('Integration with existing graph operations', () => {
    it('should work correctly after fromJSON restoration', () => {
      // Create and populate a graph
      const graph1 = new KnowledgeGraph();
      graph1.addNode(createNode('A'));
      graph1.addNode(createNode('B'));
      graph1.addNode(createNode('C'));
      graph1.addEdge(createEdge('A', 'B'));
      graph1.addEdge(createEdge('B', 'C'));

      // Serialize
      const json = graph1.toJSON();

      // Restore to new graph
      const graph2 = new KnowledgeGraph();
      graph2.fromJSON(json);

      // Centrality should work the same
      const centrality1 = graph1.calculateBetweennessCentrality();
      const centrality2 = graph2.calculateBetweennessCentrality();

      expect(centrality2.get('A')).toBe(centrality1.get('A'));
      expect(centrality2.get('B')).toBe(centrality1.get('B'));
      expect(centrality2.get('C')).toBe(centrality1.get('C'));
    });

    it('should invalidate cache after clear()', () => {
      graph.addNode(createNode('A'));
      graph.addNode(createNode('B'));
      graph.addNode(createNode('C'));
      graph.addEdge(createEdge('A', 'B'));
      graph.addEdge(createEdge('B', 'C'));

      // Calculate centrality
      const centrality1 = graph.calculateBetweennessCentrality();
      expect(centrality1.get('B')).toBeGreaterThan(0);

      // Clear graph
      graph.clear();

      // Centrality should now be empty
      const centrality2 = graph.calculateBetweennessCentrality();
      expect(centrality2.size).toBe(0);
    });

    it('should work with getNode lookup', () => {
      graph.addNode(createNode('test-id', 'Test Term'));
      graph.addNode(createNode('other-id', 'Other Term'));
      graph.addEdge(createEdge('test-id', 'other-id'));

      // Should be able to get centrality by term
      const scoreByTerm = graph.getCentralityScore('Test Term');
      const scoreById = graph.getCentralityScore('test-id');

      expect(scoreByTerm).toBe(scoreById);
    });
  });
});

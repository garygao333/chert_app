import type { Project } from '../types';

interface ProcessingResult {
  processedData: Record<string, string>;
  confidence: number;
  reasoning: string;
}

export class DataProcessingService {
  /**
   * Process natural language input and map it to project schema
   */
  static async processInput(
    input: string,
    project: Project,
    method: 'chat' | 'voice' = 'chat'
  ): Promise<ProcessingResult> {
    const processedData: Record<string, string> = {};
    let confidence = 0;
    let reasoning = '';
    
    if (!project.dataColumns || project.dataColumns.length === 0) {
      return {
        processedData: {},
        confidence: 0,
        reasoning: 'No data columns defined for this project.'
      };
    }

    const inputLower = input.toLowerCase();
    const words = inputLower.split(/[\s,\.;:]+/).filter(word => word.length > 0);
    
    let mappedColumns = 0;
    const reasoningParts: string[] = [];

    // Process each column and try to find relevant data
    for (const column of project.dataColumns) {
      const columnLower = column.toLowerCase();
      const columnWords = columnLower.split(/[\s_-]+/);
      
      // Try multiple strategies to extract data for this column
      const value = this.extractColumnValue(
        input,
        inputLower,
        words,
        column,
        columnLower,
        columnWords,
        project
      );
      
      if (value) {
        processedData[column] = value;
        mappedColumns++;
        reasoningParts.push(`${column}: "${value}"`);
      }
    }

    // Calculate confidence based on how many columns we mapped
    confidence = mappedColumns / project.dataColumns.length;
    
    // Boost confidence if we found multiple relevant pieces of data
    if (mappedColumns > 0) {
      confidence = Math.min(confidence + 0.2, 1.0);
    }

    reasoning = mappedColumns > 0 
      ? `Extracted data for ${mappedColumns} columns: ${reasoningParts.join(', ')}`
      : 'Could not map input to any defined columns. Try being more specific or using column names.';

    return {
      processedData,
      confidence,
      reasoning
    };
  }

  /**
   * Extract value for a specific column using various strategies
   */
  private static extractColumnValue(
    originalInput: string,
    inputLower: string,
    words: string[],
    column: string,
    columnLower: string,
    columnWords: string[],
    project: Project
  ): string | null {
    // Strategy 1: Direct column name mention
    const directMatch = this.findDirectColumnMatch(inputLower, words, columnLower, columnWords);
    if (directMatch) return directMatch;

    // Strategy 2: Use annotations as hints
    const annotationMatch = this.findAnnotationMatch(inputLower, words, column, project);
    if (annotationMatch) return annotationMatch;

    // Strategy 3: Use CSV sample data patterns
    const sampleMatch = this.findSamplePatternMatch(inputLower, words, column, project);
    if (sampleMatch) return sampleMatch;

    // Strategy 4: Common field types
    const typeMatch = this.findByCommonTypes(inputLower, words, columnLower);
    if (typeMatch) return typeMatch;

    return null;
  }

  /**
   * Find values when column name is directly mentioned
   */
  private static findDirectColumnMatch(
    inputLower: string,
    words: string[],
    columnLower: string,
    columnWords: string[]
  ): string | null {
    // Look for "column: value" or "column is value" patterns
    const patterns = [
      new RegExp(`${columnLower}\\s*[:=]\\s*([^,\\.;]+)`, 'i'),
      new RegExp(`${columnLower}\\s+is\\s+([^,\\.;]+)`, 'i'),
      new RegExp(`${columnLower}\\s+of\\s+([^,\\.;]+)`, 'i'),
      new RegExp(`${columnLower}\\s*-\\s*([^,\\.;]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = inputLower.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Look for column words followed by values
    for (const columnWord of columnWords) {
      if (columnWord.length < 3) continue; // Skip very short words
      
      const wordIndex = words.findIndex(word => word === columnWord);
      if (wordIndex !== -1 && wordIndex < words.length - 1) {
        // Get the next 1-3 words as the value
        const valueWords = words.slice(wordIndex + 1, Math.min(wordIndex + 4, words.length));
        const value = valueWords.join(' ');
        if (value && !this.isStopWord(value)) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Use column annotations to find relevant data
   */
  private static findAnnotationMatch(
    inputLower: string,
    words: string[],
    column: string,
    project: Project
  ): string | null {
    const annotation = project.columnAnnotations?.[column];
    if (!annotation) return null;

    const annotationLower = annotation.toLowerCase();
    const annotationWords = annotationLower.split(/[\s,\.;:]+/)
      .filter(word => word.length > 2 && !this.isStopWord(word));

    // Look for annotation keywords in the input
    for (const annotationWord of annotationWords) {
      const wordIndex = words.findIndex(word => 
        word.includes(annotationWord) || annotationWord.includes(word)
      );
      
      if (wordIndex !== -1) {
        // Found annotation keyword, look for nearby values
        const nearbyWords = [
          ...words.slice(Math.max(0, wordIndex - 2), wordIndex),
          ...words.slice(wordIndex + 1, Math.min(words.length, wordIndex + 3))
        ];
        
        for (const nearbyWord of nearbyWords) {
          if (this.isLikelyValue(nearbyWord)) {
            return nearbyWord;
          }
        }
      }
    }

    return null;
  }

  /**
   * Use CSV sample patterns to identify similar data
   */
  private static findSamplePatternMatch(
    inputLower: string,
    words: string[],
    column: string,
    project: Project
  ): string | null {
    if (!project.csvMetadata?.sampleRows) return null;

    const columnIndex = project.dataColumns?.indexOf(column);
    if (columnIndex === -1) return null;

    // Extract sample values for this column
    const sampleValues: string[] = [];
    for (const sampleRow of project.csvMetadata.sampleRows) {
      const cells = sampleRow.split(',');
      if (cells[columnIndex]) {
        const cellValue = cells[columnIndex].trim().replace(/['"]/g, '').toLowerCase();
        if (cellValue && cellValue !== column.toLowerCase()) {
          sampleValues.push(cellValue);
        }
      }
    }

    // Look for similar patterns in the input
    for (const word of words) {
      for (const sampleValue of sampleValues) {
        if (this.isSimilarValue(word, sampleValue)) {
          return word;
        }
      }
    }

    return null;
  }

  /**
   * Match based on common field types
   */
  private static findByCommonTypes(
    inputLower: string,
    words: string[],
    columnLower: string
  ): string | null {
    // Date patterns
    if (columnLower.includes('date') || columnLower.includes('time')) {
      const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/;
      const dateMatch = inputLower.match(datePattern);
      if (dateMatch) return dateMatch[0];
    }

    // Number patterns
    if (columnLower.includes('size') || columnLower.includes('length') || 
        columnLower.includes('width') || columnLower.includes('height') ||
        columnLower.includes('depth') || columnLower.includes('count') ||
        columnLower.includes('age') || columnLower.includes('weight')) {
      const numberPattern = /(\d+(?:\.\d+)?)\s*(cm|mm|m|kg|g|years?|lbs?|inches?|ft|feet)?/;
      const numberMatch = inputLower.match(numberPattern);
      if (numberMatch) return numberMatch[0];
    }

    // Color patterns
    if (columnLower.includes('color') || columnLower.includes('colour')) {
      const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'gray', 'grey', 'orange', 'purple', 'pink'];
      for (const word of words) {
        if (colors.includes(word)) {
          return word;
        }
      }
    }

    // Location patterns
    if (columnLower.includes('location') || columnLower.includes('grid') || 
        columnLower.includes('square') || columnLower.includes('area')) {
      const locationPattern = /([A-Z]\d+)|(\d+[A-Z])|([A-Z]-\d+)|(\d+-[A-Z])/;
      const locationMatch = inputLower.match(locationPattern);
      if (locationMatch) return locationMatch[0];
    }

    // Material patterns
    if (columnLower.includes('material') || columnLower.includes('type')) {
      const materials = ['ceramic', 'metal', 'wood', 'stone', 'glass', 'plastic', 'clay', 'bone', 'leather'];
      for (const word of words) {
        if (materials.some(material => word.includes(material) || material.includes(word))) {
          return word;
        }
      }
    }

    return null;
  }

  /**
   * Check if a word is a common stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Check if a word looks like a data value
   */
  private static isLikelyValue(word: string): boolean {
    // Skip very common words
    if (this.isStopWord(word)) return false;
    
    // Numbers are likely values
    if (/^\d+(\.\d+)?$/.test(word)) return true;
    
    // Words with units are likely values
    if (/\d+(cm|mm|m|kg|g|lbs?|inches?|ft|feet)$/i.test(word)) return true;
    
    // Capitalized words might be proper nouns (locations, names)
    if (/^[A-Z][a-z]+$/.test(word)) return true;
    
    // Mixed alphanumeric (like grid references)
    if (/^[A-Z]\d+$|^\d+[A-Z]$/i.test(word)) return true;
    
    return word.length > 2 && word.length < 20;
  }

  /**
   * Check if two values are similar
   */
  private static isSimilarValue(word1: string, word2: string): boolean {
    const w1 = word1.toLowerCase();
    const w2 = word2.toLowerCase();
    
    // Exact match
    if (w1 === w2) return true;
    
    // One contains the other
    if (w1.includes(w2) || w2.includes(w1)) return true;
    
    // Similar numeric values
    const num1 = parseFloat(w1);
    const num2 = parseFloat(w2);
    if (!isNaN(num1) && !isNaN(num2)) {
      return Math.abs(num1 - num2) < Math.max(num1, num2) * 0.1; // Within 10%
    }
    
    return false;
  }

  /**
   * Generate example prompts based on project schema
   */
  static generateExamplePrompts(project: Project): string[] {
    const examples: string[] = [];
    
    if (!project.dataColumns || project.dataColumns.length === 0) {
      return [
        "Describe your observation in detail",
        "Include specific measurements and details",
        "Mention location, size, and characteristics"
      ];
    }

    // Generate examples based on common column types
    const columns = project.dataColumns;
    
    if (columns.some(col => col.toLowerCase().includes('depth'))) {
      examples.push("Found artifact at depth 15cm in grid square B3");
    }
    
    if (columns.some(col => col.toLowerCase().includes('color'))) {
      examples.push("Red ceramic fragment, 3cm diameter, good condition");
    }
    
    if (columns.some(col => col.toLowerCase().includes('location') || col.toLowerCase().includes('grid'))) {
      examples.push("Located in grid A4, sandy soil texture, pH 7.2");
    }
    
    if (columns.some(col => col.toLowerCase().includes('material') || col.toLowerCase().includes('type'))) {
      examples.push("Stone tool, limestone material, sharp edges, 8cm length");
    }

    // If we don't have specific examples, generate generic ones
    if (examples.length === 0) {
      const firstFewColumns = columns.slice(0, 3).join(', ');
      examples.push(`Found item with ${firstFewColumns} details`);
      examples.push(`Observed specimen - include details about ${columns[0] || 'characteristics'}`);
      examples.push("Describe location, size, and condition of the finding");
    }

    return examples.slice(0, 3);
  }

  /**
   * Detect coordinate columns from CSV data columns
   * Looks for Latitude/Longitude, lat/lon, lat/lng, or x/y variations
   */
  static detectCoordinateColumns(dataColumns: string[]): {
    latitude: string;
    longitude: string;
  } | null {
    if (!dataColumns || dataColumns.length < 2) {
      return null;
    }

    const normalizedColumns = dataColumns.map(col => ({
      original: col,
      normalized: col.toLowerCase().trim()
    }));

    // Latitude patterns (case-insensitive)
    const latitudePatterns = [
      /^latitude$/i,
      /^lat$/i,
      /^y$/i,
      /^northing$/i,
      /^north$/i
    ];

    // Longitude patterns (case-insensitive)
    const longitudePatterns = [
      /^longitude$/i,
      /^lon$/i,
      /^lng$/i,
      /^long$/i,
      /^x$/i,
      /^easting$/i,
      /^east$/i
    ];

    let latitudeColumn: string | null = null;
    let longitudeColumn: string | null = null;

    // Find latitude column
    for (const { original, normalized } of normalizedColumns) {
      if (latitudePatterns.some(pattern => pattern.test(normalized))) {
        latitudeColumn = original;
        break;
      }
    }

    // Find longitude column
    for (const { original, normalized } of normalizedColumns) {
      if (longitudePatterns.some(pattern => pattern.test(normalized))) {
        longitudeColumn = original;
        break;
      }
    }

    // Only return if we found both coordinate columns
    if (latitudeColumn && longitudeColumn) {
      return {
        latitude: latitudeColumn,
        longitude: longitudeColumn
      };
    }

    return null;
  }

  /**
   * Enhance text input with GIS coordinates for LLM processing
   */
  static enhanceInputWithGISData(
    originalInput: string,
    gisData: { latitude: number; longitude: number },
    coordinateColumns: { latitude: string; longitude: string }
  ): string {
    const enhancedText = `${originalInput}. The ${coordinateColumns.latitude} is ${gisData.latitude} and the ${coordinateColumns.longitude} is ${gisData.longitude}.`;
    return enhancedText;
  }
}
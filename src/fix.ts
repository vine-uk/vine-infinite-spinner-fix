const _fetch = window.fetch;

const formatDimensionValue = (value: any): any => {
  if (typeof value !== 'string') {
    return value;
  }
  
  return value
    .replace(/([^a-z0-9])$/i, '$1 \u200B')
    .replace(/:([^\s])/g, ': $1')
    .replace(/(\([^)]*\))([^\s])/g, '$1 $2');
};

window.fetch = async (...args): Promise<Response> => {
  const response = await _fetch(...args);

  if (typeof args[0] === 'string' && args[0].startsWith("api/recommendations")) {
    try {
      const jsonData: any = await response.clone().json();
      
      if (jsonData.result && jsonData.result.variations) {        
        let fixed = false;
        
        let templateKeys: string[] | null = null;
        let hasInconsistentKeys = false;
        let hasMissingDimensions = false;
        const keyNormalizationMap = new Map<string, string>();
        let maxDimensionCount = 0;
        
        const dimensionKeysCache = new Map<any, string[]>();
        
        for (let idx = 0; idx < jsonData.result.variations.length; idx++) {
          const variation = jsonData.result.variations[idx];
          
          if (!variation.dimensions || Object.keys(variation.dimensions).length === 0) {
            hasMissingDimensions = true;
            continue;
          }
          
          const currentKeys = Object.keys(variation.dimensions);
          dimensionKeysCache.set(variation, currentKeys);
          const dimensionCount = currentKeys.length;
          
          if (dimensionCount > maxDimensionCount) {
            maxDimensionCount = dimensionCount;
            templateKeys = currentKeys;
          }
          
          if (templateKeys && dimensionCount === templateKeys.length) {
            for (let keyIndex = 0; keyIndex < currentKeys.length; keyIndex++) {
              if (currentKeys[keyIndex] !== templateKeys[keyIndex]) {
                hasInconsistentKeys = true;
                keyNormalizationMap.set(currentKeys[keyIndex], templateKeys[keyIndex]);
              }
            }
          }
        }
        if (hasMissingDimensions && templateKeys && templateKeys.length > 1) {
          
          jsonData.result.variations = jsonData.result.variations.map((variation: any, index: number) => {
            
            const cachedKeys = dimensionKeysCache.get(variation);
            
            if (!cachedKeys || cachedKeys.length === 0) {
              return {
                ...variation,
                dimensions: { variation: variation.asin }
              };
            } else {
              let normalizedDimensions = variation.dimensions;
              if (hasInconsistentKeys && keyNormalizationMap.size > 0) {
                normalizedDimensions = {};
                for (const key in variation.dimensions) {
                  const normalizedKey = keyNormalizationMap.get(key) || key;
                  normalizedDimensions[normalizedKey] = variation.dimensions[key];
                }
              }
              
              const values = templateKeys.map(key => {
                const value = normalizedDimensions[key] || 'N/A';
                return formatDimensionValue(value);
              });
              
              return {
                ...variation,
                dimensions: { variation: values.join(', ') }
              };
            }
          });
          
          fixed = true;
        }
        else {
          
          jsonData.result.variations = jsonData.result.variations.map((variation: any, index: number) => {
            
            let variationKeys = dimensionKeysCache.get(variation);
            if (!variationKeys) {
              if (!variation.dimensions || Object.keys(variation.dimensions).length === 0) {
                variation.dimensions = { asin_no: variation.asin };
                fixed = true;
                return variation;
              }
              variationKeys = Object.keys(variation.dimensions);
            }
            
            if (hasInconsistentKeys) {
              const newDimensions: any = {};
              let wasNormalized = false;
              
              for (const key in variation.dimensions) {
                const normalizedKey = keyNormalizationMap.get(key) || key;
                if (normalizedKey !== key) {
                  wasNormalized = true;
                }
                newDimensions[normalizedKey] = variation.dimensions[key];
              }
              
              if (wasNormalized) {
                variation.dimensions = newDimensions;
                fixed = true;
              }
            }
            
            for (const key in variation.dimensions) {
              const original = variation.dimensions[key];
              const formatted = formatDimensionValue(original);
              
              if (original !== formatted) {
                variation.dimensions[key] = formatted;
                fixed = true;
              }
            }

            return variation;
          });
        }
        
        if (fixed) {
          window.dispatchEvent(new CustomEvent('variationsFixed'));
        }
      }

      return new Response(JSON.stringify(jsonData), {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText        
      });

    } catch (error) {
      return response;
    }
  }

  return response;
};
<?php

namespace App\Services;

use DOMDocument;
use DOMXPath;

class SvgSanitizerService
{
    /**
     * List of allowed SVG tags
     */
    protected array $allowedTags = [
        'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
        'rect', 'text', 'tspan', 'defs', 'clipPath', 'linearGradient',
        'radialGradient', 'stop', 'use', 'symbol', 'title', 'desc'
    ];

    /**
     * List of dangerous attributes that should be removed
     */
    protected array $dangerousAttributes = [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onmousemove',
        'onmousedown', 'onmouseup', 'onfocus', 'onblur', 'onchange', 'onsubmit',
        'onkeydown', 'onkeyup', 'onkeypress', 'onanimationend', 'onanimationstart',
        'ontouchstart', 'ontouchend', 'ontouchmove', 'onwheel'
    ];

    /**
     * Sanitize SVG content by removing dangerous elements
     *
     * @param string $svgContent
     * @return string|false Returns sanitized SVG or false if validation fails
     */
    public function sanitize(string $svgContent): string|false
    {
        // Load XML with error suppression
        libxml_use_internal_errors(true);

        $dom = new DOMDocument();
        $dom->loadXML($svgContent, LIBXML_NONET | LIBXML_DTDLOAD | LIBXML_DTDATTR);

        // Check for XML errors
        $errors = libxml_get_errors();
        libxml_clear_errors();

        if (!empty($errors)) {
            return false;
        }

        // Get root element
        $root = $dom->documentElement;

        if (!$root || $root->tagName !== 'svg') {
            return false;
        }

        // Remove dangerous scripts and foreign objects
        $this->removeElements($dom, ['script', 'foreignObject', 'iframe', 'object', 'embed']);

        // Remove event handlers and dangerous attributes
        $this->removeDangerousAttributes($dom);

        // Remove external references (prevent SSRF)
        $this->sanitizeExternalReferences($dom);

        return $dom->saveXML();
    }

    /**
     * Remove specific elements from DOM
     *
     * @param DOMDocument $dom
     * @param array $tagNames
     * @return void
     */
    protected function removeElements(DOMDocument $dom, array $tagNames): void
    {
        $xpath = new DOMXPath($dom);

        foreach ($tagNames as $tagName) {
            $elements = $xpath->query('//' . $tagName);

            foreach ($elements as $element) {
                $element->parentNode->removeChild($element);
            }
        }
    }

    /**
     * Remove dangerous attributes from all elements
     *
     * @param DOMDocument $dom
     * @return void
     */
    protected function removeDangerousAttributes(DOMDocument $dom): void
    {
        $xpath = new DOMXPath($dom);
        $allElements = $xpath->query('//*');

        foreach ($allElements as $element) {
            // Check each attribute
            $attributes = [];
            foreach ($element->attributes as $attr) {
                $attributes[] = $attr->name;
            }

            foreach ($attributes as $attrName) {
                $attrLower = strtolower($attrName);

                // Remove event handlers
                if (in_array($attrLower, $this->dangerousAttributes) ||
                    str_starts_with($attrLower, 'on')) {
                    $element->removeAttribute($attrName);
                }

                // Check for javascript: protocol in attributes
                $attrValue = $element->getAttribute($attrName);
                if (preg_match('/^\s*javascript:/i', $attrValue)) {
                    $element->removeAttribute($attrName);
                }
            }
        }
    }

    /**
     * Sanitize external references to prevent SSRF
     *
     * @param DOMDocument $dom
     * @return void
     */
    protected function sanitizeExternalReferences(DOMDocument $dom): void
    {
        $xpath = new DOMXPath($dom);

        // Find all elements with href or xlink:href
        $elements = $xpath->query('//*[@href or @xlink:href]');

        foreach ($elements as $element) {
            $href = $element->getAttribute('href') ?: $element->getAttribute('xlink:href');

            // Only allow fragment identifiers (#something) and data: URIs
            if (!empty($href) &&
                !str_starts_with($href, '#') &&
                !str_starts_with($href, 'data:')) {
                $element->removeAttribute('href');
                $element->removeAttribute('xlink:href');
            }
        }
    }

    /**
     * Validate SVG file and return sanitized content
     *
     * @param string $filePath
     * @return string|false
     */
    public function sanitizeFile(string $filePath): string|false
    {
        if (!file_exists($filePath)) {
            return false;
        }

        $content = file_get_contents($filePath);

        if ($content === false) {
            return false;
        }

        return $this->sanitize($content);
    }
}

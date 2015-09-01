const isUndefined = require('lodash/lang/isUndefined');
const reduce = require('lodash/collection/reduce');
const chunk = require('lodash/array/chunk');
const each = require('lodash/collection/each');

const CollectionPage = require('../page');
const CollectionBase = require('../base');

/**
 * A collection that derives its content from a match in a files yaml
 * frontmatter data.
 */
class MetadataCollection extends CollectionBase {
  constructor(name, collectionConfig) {
    super(name, collectionConfig);

    /**
     * Object which holds a mapping of metadata value to the files that contain
     * the metadata property.
     * For example with metadata of 'tags' you'd have:
     * {
     * 	'tag-name': [file, file],
     * 	'other-tag': [file, file]
     * }
     * @type {Object.<string, Array.<File>>}
     */
    this.metadataFiles;
  }

  /**
   * Checks to see if this file passes all requirements to be considered a part
   * of this collection.
   * @param {File} file File object.
   * @return {boolean} true if the file meets all requirements.
   */
  _isFileInCollection(file) {
    return !isUndefined(file.data[this.metadata]);
  }

  /**
   * Populate the Collection's files via file system path or metadata attribute.
   * @param {Array.<Files>} files Array of files.
   * @return {Collection}
   */
  populate(files) {
    // Initialize template data.
    this.data.metadata = {};

    // Store files that are in our collection.
    this.metadataFiles = reduce(files, (all, file) => {
      if (!this._isFileInCollection(file)) {
        return all;
      }

      let metadataValues = file.data[this.metadata];
      if (!Array.isArray(metadataValues)) {
        metadataValues = [metadataValues];
      }

      metadataValues.forEach(value => {
        all[value] = all[value] || [];

        all[value].push(file);

        // Add data to template accessible object.
        this.data.metadata[value] = this.data.metadata[value] || [];
        this.data.metadata[value].push(file.data);
      });

      return all;
    }, {});

    this._createCollectionPages();

    return this;
  }

  /**
   * Create CollectionPage objects for our Collection.
   * @return {boolean} True if we successfully created CollectionPages.
   * @private
   */
  _createCollectionPages() {
    // If no permalink paths are set then we don't render a CollectionPage.
    if (!(this.pagination &&
          this.pagination.permalinkIndex && this.pagination.permalinkPage)) {
      return false;
    }

    if (this.metadataFiles) {
      // Create CollectionPage objects to represent our pagination pages.
      each(this.metadataFiles, (files, metadataKey) => {
        // Sort files.
        files = CollectionBase.sortFiles(files, this.sort);

        // Break up our array of files into arrays that match our defined
        // pagination size.
        let pages = chunk(files, this.pagination.size);

        pages.forEach((pageFiles, index) => {
          // Make 1-indexed.
          let pageNumber = index + 1;

          let collectionPage = new CollectionPage(
            pageFiles,
            index === 0 ?
              this.pagination.permalinkIndex :
              this.pagination.permalinkPage,
            {
              metadata: metadataKey,

              // Current page number
              page: pageNumber,

              // How many pages in the collection.
              total_pages: pages.length,

              // Posts displayed per page
              per_page: this.pagination.size,

              // Total number of posts
              total: files.length
            }
          );

          // Add to our array of pages.
          this.pages.push(collectionPage);
        });
      });
    }

    this._linkPages();

    return true;
  }
}

module.exports = MetadataCollection;
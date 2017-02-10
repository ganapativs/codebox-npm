class RemoveStorageBucket {
  constructor(serverless) {
    this.serverless = serverless;
    this.provider = this.serverless.getProvider('aws');
    this.s3 = new this.provider.sdk.S3({
      signatureVersion: 'v4',
    });
    this.bucket = this.serverless.service.resources
      .Resources
      .PackageStorage
      .Properties
      .BucketName;

    this.hooks = {
      'before:remove:remove': this.beforeRemove.bind(this),
    };
  }

  listAllKeys(marker) {
    const allKeys = [];
    return this.s3.listObjects({
      Bucket: this.bucket,
      Marker: marker,
    }).promise()
   .then((data) => {
      allKeys.push(data.Contents);

      if (data.IsTruncated) {
        return this.listAllKeys(data.NextMarker);
      }

      return [].concat.apply([], allKeys).map(
        ({ Key }) => ({ Key })
      );
    })
  }

  beforeRemove() {
    return new Promise((resolve, reject) => {
      return this.listAllKeys()
      .then((keys) => {
        return this.s3
        .deleteObjects({
          Bucket: this.bucket,
          Delete: {
            Objects: keys,
          },
        }).promise()
        .then(() => {
          return this.s3
          .deleteBucket({
            Bucket: this.bucket,
          }).promise()
          .then(() => {
            this.serverless.cli.log('AWS Package Storage Removed');
            resolve();
          })
        })
      })
      .catch((err) => {
        this.serverless.cli.log(`Could not remove AWS package storage: ${err.message}`);
        reject(err);
      });
    });
  }
}

module.exports = RemoveStorageBucket;

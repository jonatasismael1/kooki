update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'audio/mpeg','audio/mp4','audio/webm','audio/wav','audio/ogg','audio/aac','audio/flac',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'recipe-audio';
